package com.cargo.uld.service;

import com.cargo.uld.common.BusinessException;
import com.cargo.uld.dto.ReviewPassRequest;
import com.cargo.uld.dto.ReviewRejectRequest;
import com.cargo.uld.entity.*;
import com.cargo.uld.repository.*;
import com.cargo.uld.security.SecurityUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ReviewService {

    private final UldRepository uldRepository;
    private final WaybillRepository waybillRepository;
    private final FlightRepository flightRepository;
    private final ReviewRecordRepository reviewRecordRepository;

    @Transactional(rollbackFor = Exception.class)
    public void submitForReview(Long uldId) {
        if (!SecurityUtil.isReviewer() && !SecurityUtil.isOperator() && !SecurityUtil.isSupervisor()) {
            throw BusinessException.of(403, "无权限操作，仅REVIEWER或OPERATOR可提交复核");
        }

        Uld uld = uldRepository.findById(uldId)
                .orElseThrow(() -> BusinessException.of("板箱不存在"));

        if (uld.getFlightId() != null) {
            Flight flight = flightRepository.findById(uld.getFlightId()).orElse(null);
            if (flight != null && Flight.Status.CLOSED.equals(flight.getStatus())) {
                throw BusinessException.of("航班已关闭，不能提交复核");
            }
        }

        if (!Uld.ReviewStatus.PENDING.equals(uld.getReviewStatus())
                && !Uld.ReviewStatus.REJECTED.equals(uld.getReviewStatus())) {
            throw BusinessException.of("板箱当前复核状态为" + uld.getReviewStatus() + "，不能提交复核");
        }

        BigDecimal currentWeight = uld.getCurrentWeight() != null ? uld.getCurrentWeight() : BigDecimal.ZERO;
        List<Waybill> loadedWaybills = waybillRepository
                .findByCurrentUldIdAndLoadedStatus(uldId, Waybill.LoadedStatus.LOADED);
        if (currentWeight.compareTo(BigDecimal.ZERO) <= 0 && loadedWaybills.isEmpty()) {
            throw BusinessException.of("板箱未装货，不能提交复核");
        }

        uld.setReviewStatus(Uld.ReviewStatus.REVIEWING);
        uld.setRejectReason(null);
        uldRepository.save(uld);

        ReviewRecord record = new ReviewRecord();
        record.setUldId(uldId);
        record.setReviewType(ReviewRecord.ReviewType.SUBMIT);
        record.setExpectedWeight(currentWeight);
        record.setReviewerId(SecurityUtil.getCurrentUserId());
        reviewRecordRepository.save(record);
    }

    @Transactional(rollbackFor = Exception.class)
    public void passReview(Long uldId, ReviewPassRequest request) {
        if (!SecurityUtil.isReviewer() && !SecurityUtil.isSupervisor()) {
            throw BusinessException.of(403, "无权限操作，仅REVIEWER或SUPERVISOR可复核通过");
        }

        Uld uld = uldRepository.findById(uldId)
                .orElseThrow(() -> BusinessException.of("板箱不存在"));

        if (uld.getFlightId() != null) {
            Flight flight = flightRepository.findById(uld.getFlightId()).orElse(null);
            if (flight != null && Flight.Status.CLOSED.equals(flight.getStatus())) {
                throw BusinessException.of("航班已关闭，不能复核通过");
            }
        }

        if (!Uld.ReviewStatus.REVIEWING.equals(uld.getReviewStatus())
                && !Uld.ReviewStatus.PENDING.equals(uld.getReviewStatus())) {
            throw BusinessException.of("板箱当前复核状态为" + uld.getReviewStatus() + "，不能复核通过");
        }

        BigDecimal expectedWeight = uld.getCurrentWeight() != null ? uld.getCurrentWeight() : BigDecimal.ZERO;
        BigDecimal actualWeight = request.getActualWeight();
        BigDecimal weightDiff = actualWeight.subtract(expectedWeight);

        uld.setReviewStatus(Uld.ReviewStatus.PASSED);
        uld.setLocked(true);
        uld.setReviewedBy(SecurityUtil.getCurrentUserId());
        uld.setReviewedAt(LocalDateTime.now());
        uld.setRejectReason(null);
        uldRepository.save(uld);

        List<Waybill> loadedWaybills = waybillRepository
                .findByCurrentUldIdAndLoadedStatus(uldId, Waybill.LoadedStatus.LOADED);
        for (Waybill wb : loadedWaybills) {
            wb.setLocked(true);
            waybillRepository.save(wb);
        }

        ReviewRecord record = new ReviewRecord();
        record.setUldId(uldId);
        record.setReviewType(ReviewRecord.ReviewType.PASS);
        record.setExpectedWeight(expectedWeight);
        record.setActualWeight(actualWeight);
        record.setWeightDiff(weightDiff);
        record.setReviewerId(SecurityUtil.getCurrentUserId());
        record.setRemark(request.getRemark());
        reviewRecordRepository.save(record);
    }

    @Transactional(rollbackFor = Exception.class)
    public void rejectReview(Long uldId, ReviewRejectRequest request) {
        if (!SecurityUtil.isReviewer() && !SecurityUtil.isSupervisor()) {
            throw BusinessException.of(403, "无权限操作，仅REVIEWER或SUPERVISOR可复核退回");
        }

        Uld uld = uldRepository.findById(uldId)
                .orElseThrow(() -> BusinessException.of("板箱不存在"));

        if (uld.getFlightId() != null) {
            Flight flight = flightRepository.findById(uld.getFlightId()).orElse(null);
            if (flight != null && Flight.Status.CLOSED.equals(flight.getStatus())) {
                throw BusinessException.of("航班已关闭，不能复核退回");
            }
        }

        if (!Uld.ReviewStatus.REVIEWING.equals(uld.getReviewStatus())) {
            throw BusinessException.of("板箱当前复核状态为" + uld.getReviewStatus() + "，不能复核退回");
        }

        uld.setReviewStatus(Uld.ReviewStatus.REJECTED);
        uld.setLocked(false);
        uld.setRejectReason(request.getRejectReason());
        uldRepository.save(uld);

        List<Waybill> loadedWaybills = waybillRepository
                .findByCurrentUldIdAndLoadedStatus(uldId, Waybill.LoadedStatus.LOADED);
        for (Waybill wb : loadedWaybills) {
            wb.setLocked(false);
            waybillRepository.save(wb);
        }

        ReviewRecord record = new ReviewRecord();
        record.setUldId(uldId);
        record.setReviewType(ReviewRecord.ReviewType.REJECT);
        record.setExpectedWeight(uld.getCurrentWeight());
        record.setRejectReason(request.getRejectReason());
        record.setUnlockToStatus(request.getUnlockToStatus());
        record.setReviewerId(SecurityUtil.getCurrentUserId());
        record.setRemark(request.getRemark());
        reviewRecordRepository.save(record);
    }
}
