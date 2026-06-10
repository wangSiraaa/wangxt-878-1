package com.cargo.uld.service;

import com.cargo.uld.common.BusinessException;
import com.cargo.uld.dto.LoadRequest;
import com.cargo.uld.dto.UnloadRequest;
import com.cargo.uld.entity.*;
import com.cargo.uld.repository.*;
import com.cargo.uld.security.SecurityUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class LoadService {

    private final UldRepository uldRepository;
    private final WaybillRepository waybillRepository;
    private final FlightRepository flightRepository;
    private final LoadRecordRepository loadRecordRepository;
    private final UldService uldService;

    @Transactional(rollbackFor = Exception.class)
    public void loadWaybill(LoadRequest request) {
        Long waybillId = request.getWaybillId();
        Long uldId = request.getUldId();

        Uld uld = uldRepository.findById(uldId)
                .orElseThrow(() -> BusinessException.of("板箱不存在"));

        if (uld.getFlightId() != null) {
            Flight flight = flightRepository.findById(uld.getFlightId()).orElse(null);
            if (flight != null && Flight.Status.CLOSED.equals(flight.getStatus())) {
                throw BusinessException.of("航班已关闭，不能装板");
            }
        }

        if (Boolean.TRUE.equals(uld.getLocked())) {
            throw BusinessException.of("板箱已锁定，不能装板");
        }

        if (!Uld.ReviewStatus.PENDING.equals(uld.getReviewStatus())
                && !Uld.ReviewStatus.REJECTED.equals(uld.getReviewStatus())) {
            throw BusinessException.of("板箱复核状态为" + uld.getReviewStatus() + "，不能装板");
        }

        Waybill waybill = waybillRepository.findById(waybillId)
                .orElseThrow(() -> BusinessException.of("货邮单不存在"));

        if (!Waybill.SecurityStatus.PASSED.equals(waybill.getSecurityStatus())) {
            if (Boolean.TRUE.equals(waybill.getDangerousFlag())) {
                throw BusinessException.of("危险品货邮单未安检通过，不能装板");
            }
            throw BusinessException.of("货邮单未安检通过，不能装板");
        }

        if (Waybill.LoadedStatus.LOADED.equals(waybill.getLoadedStatus())) {
            String existedUldCode = "";
            if (waybill.getCurrentUldId() != null) {
                Uld existedUld = uldRepository.findById(waybill.getCurrentUldId()).orElse(null);
                if (existedUld != null) {
                    existedUldCode = existedUld.getUldCode();
                }
            }
            throw BusinessException.of(400, "货邮单已在板箱" + existedUldCode + "中，需先卸下");
        }

        Uld freshUld = uldRepository.findById(uldId)
                .orElseThrow(() -> BusinessException.of("板箱不存在"));

        BigDecimal currentWeight = freshUld.getCurrentWeight() != null ? freshUld.getCurrentWeight() : BigDecimal.ZERO;
        BigDecimal waybillWeight = waybill.getWeight() != null ? waybill.getWeight() : BigDecimal.ZERO;
        BigDecimal newTotalWeight = currentWeight.add(waybillWeight);

        if (newTotalWeight.compareTo(freshUld.getWeightLimit()) > 0) {
            BigDecimal exceedWeight = newTotalWeight.subtract(freshUld.getWeightLimit());
            String message = String.format("板箱超重：当前%.2fkg，待装%.2fkg，限重%.2fkg，超出%.2fkg",
                    currentWeight, waybillWeight, freshUld.getWeightLimit(), exceedWeight);
            throw BusinessException.of(409, message);
        }

        freshUld.setCurrentWeight(newTotalWeight);
        uldRepository.save(freshUld);

        waybill.setLoadedStatus(Waybill.LoadedStatus.LOADED);
        waybill.setCurrentUldId(uldId);
        waybillRepository.save(waybill);

        LoadRecord record = new LoadRecord();
        record.setWaybillId(waybillId);
        record.setUldId(uldId);
        record.setOperationType(LoadRecord.OperationType.LOAD);
        record.setPieces(waybill.getPieces());
        record.setWeight(waybillWeight);
        record.setOperatorId(SecurityUtil.getCurrentUserId());
        record.setRemark(request.getRemark());
        loadRecordRepository.save(record);
    }

    @Transactional(rollbackFor = Exception.class)
    public void unloadWaybill(UnloadRequest request) {
        Long waybillId = request.getWaybillId();
        Long uldId = request.getUldId();

        Uld uld = uldRepository.findById(uldId)
                .orElseThrow(() -> BusinessException.of("板箱不存在"));

        if (uld.getFlightId() != null) {
            Flight flight = flightRepository.findById(uld.getFlightId()).orElse(null);
            if (flight != null && Flight.Status.CLOSED.equals(flight.getStatus())) {
                throw BusinessException.of("航班已关闭，不能卸下");
            }
        }

        Waybill waybill = waybillRepository.findById(waybillId)
                .orElseThrow(() -> BusinessException.of("货邮单不存在"));

        if (!Objects.equals(waybill.getCurrentUldId(), uldId)
                || !Waybill.LoadedStatus.LOADED.equals(waybill.getLoadedStatus())) {
            throw BusinessException.of("货邮单不在此板箱中或未处于已装状态");
        }

        boolean isReviewed = Uld.ReviewStatus.PASSED.equals(uld.getReviewStatus());
        if (isReviewed) {
            if (!SecurityUtil.isSupervisor() && !SecurityUtil.isReviewer()) {
                throw BusinessException.of(403, "复核通过后的卸下操作仅SUPERVISOR或REVIEWER可执行");
            }
        } else {
            if (Boolean.TRUE.equals(uld.getLocked())) {
                throw BusinessException.of("板箱已锁定，不能卸下");
            }
        }

        BigDecimal waybillWeight = waybill.getWeight() != null ? waybill.getWeight() : BigDecimal.ZERO;
        BigDecimal currentWeight = uld.getCurrentWeight() != null ? uld.getCurrentWeight() : BigDecimal.ZERO;
        BigDecimal newWeight = currentWeight.subtract(waybillWeight);
        if (newWeight.compareTo(BigDecimal.ZERO) < 0) {
            newWeight = BigDecimal.ZERO;
        }
        uld.setCurrentWeight(newWeight);
        uldRepository.save(uld);

        if (isReviewed) {
            waybill.setLoadedStatus(Waybill.LoadedStatus.UNLOADED_REVIEW);
        } else {
            waybill.setLoadedStatus(Waybill.LoadedStatus.UNLOADED);
        }
        waybill.setCurrentUldId(null);
        waybillRepository.save(waybill);

        LoadRecord record = new LoadRecord();
        record.setWaybillId(waybillId);
        record.setUldId(uldId);
        record.setOperationType(LoadRecord.OperationType.UNLOAD);
        record.setPieces(waybill.getPieces());
        record.setWeight(waybillWeight);
        record.setOperatorId(SecurityUtil.getCurrentUserId());
        record.setRemark(request.getRemark());
        loadRecordRepository.save(record);
    }
}
