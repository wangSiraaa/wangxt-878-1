package com.cargo.uld.service;

import com.cargo.uld.common.BusinessException;
import com.cargo.uld.common.PageResult;
import com.cargo.uld.dto.SecurityCheckRequest;
import com.cargo.uld.dto.WaybillRequest;
import com.cargo.uld.dto.WaybillVO;
import com.cargo.uld.entity.Flight;
import com.cargo.uld.entity.Uld;
import com.cargo.uld.entity.User;
import com.cargo.uld.entity.Waybill;
import com.cargo.uld.repository.FlightRepository;
import com.cargo.uld.repository.UldRepository;
import com.cargo.uld.repository.UserRepository;
import com.cargo.uld.repository.WaybillRepository;
import com.cargo.uld.security.SecurityUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class WaybillService {

    private final WaybillRepository waybillRepository;
    private final FlightRepository flightRepository;
    private final UldRepository uldRepository;
    private final UserRepository userRepository;

    public PageResult<WaybillVO> queryPage(String waybillNo, Long flightId, String securityStatus,
                                            String loadedStatus, Pageable pageable) {
        Specification<Waybill> spec = (root, query, cb) -> {
            List<jakarta.persistence.criteria.Predicate> predicates = new ArrayList<>();
            if (StringUtils.hasText(waybillNo)) {
                predicates.add(cb.like(root.get("waybillNo"), "%" + waybillNo + "%"));
            }
            if (flightId != null) {
                predicates.add(cb.equal(root.get("flightId"), flightId));
            }
            if (StringUtils.hasText(securityStatus)) {
                predicates.add(cb.equal(root.get("securityStatus"), securityStatus));
            }
            if (StringUtils.hasText(loadedStatus)) {
                predicates.add(cb.equal(root.get("loadedStatus"), loadedStatus));
            }
            return cb.and(predicates.toArray(new jakarta.persistence.criteria.Predicate[0]));
        };

        Page<Waybill> page = waybillRepository.findAll(spec, pageable);
        List<WaybillVO> voList = page.getContent().stream()
                .map(this::toVO)
                .collect(Collectors.toList());

        return new PageResult<>(page.getTotalElements(), voList,
                pageable.getPageNumber() + 1, pageable.getPageSize());
    }

    @Transactional
    public Waybill create(WaybillRequest request) {
        if (waybillRepository.existsByWaybillNo(request.getWaybillNo())) {
            throw BusinessException.of("货邮单号已存在：" + request.getWaybillNo());
        }
        if (request.getFlightId() != null) {
            Flight flight = flightRepository.findById(request.getFlightId())
                    .orElseThrow(() -> BusinessException.of("航班不存在"));
            if (Flight.Status.CLOSED.equals(flight.getStatus())) {
                throw BusinessException.of("航班已关闭，不能创建货邮单");
            }
        }
        Waybill waybill = new Waybill();
        waybill.setWaybillNo(request.getWaybillNo());
        waybill.setFlightId(request.getFlightId());
        waybill.setShipper(request.getShipper());
        waybill.setConsignee(request.getConsignee());
        waybill.setPieces(request.getPieces());
        waybill.setWeight(request.getWeight());
        waybill.setVolume(request.getVolume());
        waybill.setGoodsDescription(request.getGoodsDescription());
        waybill.setDangerousFlag(request.getDangerousFlag() != null ? request.getDangerousFlag() : false);
        waybill.setDangerousLevel(request.getDangerousLevel());
        waybill.setCreatedBy(SecurityUtil.getCurrentUserId());
        return waybillRepository.save(waybill);
    }

    public WaybillVO getDetail(Long id) {
        Waybill waybill = waybillRepository.findById(id)
                .orElseThrow(() -> BusinessException.of("货邮单不存在"));
        return toVO(waybill);
    }

    @Transactional
    public Waybill update(Long id, WaybillRequest request) {
        Waybill waybill = waybillRepository.findById(id)
                .orElseThrow(() -> BusinessException.of("货邮单不存在"));
        checkModifiable(waybill);
        if (!waybill.getWaybillNo().equals(request.getWaybillNo())
                && waybillRepository.existsByWaybillNo(request.getWaybillNo())) {
            throw BusinessException.of("货邮单号已存在：" + request.getWaybillNo());
        }
        if (request.getFlightId() != null && !Objects.equals(waybill.getFlightId(), request.getFlightId())) {
            Flight flight = flightRepository.findById(request.getFlightId())
                    .orElseThrow(() -> BusinessException.of("航班不存在"));
            if (Flight.Status.CLOSED.equals(flight.getStatus())) {
                throw BusinessException.of("航班已关闭，不能修改关联航班");
            }
        }
        waybill.setWaybillNo(request.getWaybillNo());
        waybill.setFlightId(request.getFlightId());
        waybill.setShipper(request.getShipper());
        waybill.setConsignee(request.getConsignee());
        waybill.setPieces(request.getPieces());
        waybill.setWeight(request.getWeight());
        waybill.setVolume(request.getVolume());
        waybill.setGoodsDescription(request.getGoodsDescription());
        waybill.setDangerousFlag(request.getDangerousFlag() != null ? request.getDangerousFlag() : false);
        waybill.setDangerousLevel(request.getDangerousLevel());
        return waybillRepository.save(waybill);
    }

    @Transactional
    public void delete(Long id) {
        Waybill waybill = waybillRepository.findById(id)
                .orElseThrow(() -> BusinessException.of("货邮单不存在"));
        if (Waybill.LoadedStatus.LOADED.equals(waybill.getLoadedStatus())
                || (waybill.getCurrentUldId() != null
                && !Waybill.LoadedStatus.UNLOADED_REVIEW.equals(waybill.getLoadedStatus()))) {
            throw BusinessException.of("货邮单已装板或未卸下，不能删除");
        }
        waybillRepository.delete(waybill);
    }

    @Transactional
    public Waybill securityCheck(Long id, SecurityCheckRequest request) {
        if (!SecurityUtil.isInspector() && !SecurityUtil.isSupervisor()) {
            throw BusinessException.of(403, "无权限操作，仅INSPECTOR或SUPERVISOR可执行安检");
        }
        if (!Waybill.SecurityStatus.PASSED.equals(request.getStatus())
                && !Waybill.SecurityStatus.REJECTED.equals(request.getStatus())) {
            throw BusinessException.of("安检状态无效，仅PASSED或REJECTED");
        }
        Waybill waybill = waybillRepository.findById(id)
                .orElseThrow(() -> BusinessException.of("货邮单不存在"));
        if (waybill.getFlightId() != null) {
            Flight flight = flightRepository.findById(waybill.getFlightId()).orElse(null);
            if (flight != null && Flight.Status.CLOSED.equals(flight.getStatus())) {
                throw BusinessException.of("航班已关闭，不能执行安检");
            }
        }
        if (Boolean.TRUE.equals(waybill.getDangerousFlag())
                && Waybill.SecurityStatus.PASSED.equals(request.getStatus())
                && !StringUtils.hasText(request.getRemark())) {
            throw BusinessException.of("危险品安检通过必须填写安检备注");
        }
        waybill.setSecurityStatus(request.getStatus());
        waybill.setInspectedBy(SecurityUtil.getCurrentUserId());
        waybill.setInspectedAt(LocalDateTime.now());
        waybill.setSecurityRemark(request.getRemark());
        return waybillRepository.save(waybill);
    }

    public void checkModifiable(Waybill waybill) {
        if (Boolean.TRUE.equals(waybill.getLocked())) {
            throw BusinessException.of("货邮单已锁定，不能修改");
        }
        if (Waybill.LoadedStatus.LOADED.equals(waybill.getLoadedStatus())) {
            throw BusinessException.of("货邮单已装板，不能修改重量等信息");
        }
        if (waybill.getFlightId() != null) {
            Flight flight = flightRepository.findById(waybill.getFlightId()).orElse(null);
            if (flight != null && Flight.Status.CLOSED.equals(flight.getStatus())) {
                throw BusinessException.of("航班已关闭，不能修改货邮单");
            }
        }
    }

    private WaybillVO toVO(Waybill w) {
        WaybillVO vo = new WaybillVO();
        vo.setId(w.getId());
        vo.setWaybillNo(w.getWaybillNo());
        vo.setFlightId(w.getFlightId());
        vo.setShipper(w.getShipper());
        vo.setConsignee(w.getConsignee());
        vo.setPieces(w.getPieces());
        vo.setWeight(w.getWeight());
        vo.setVolume(w.getVolume());
        vo.setGoodsDescription(w.getGoodsDescription());
        vo.setDangerousFlag(w.getDangerousFlag());
        vo.setDangerousLevel(w.getDangerousLevel());
        vo.setSecurityStatus(w.getSecurityStatus());
        vo.setInspectedBy(w.getInspectedBy());
        vo.setInspectedAt(w.getInspectedAt());
        vo.setSecurityRemark(w.getSecurityRemark());
        vo.setLoadedStatus(w.getLoadedStatus());
        vo.setCurrentUldId(w.getCurrentUldId());
        vo.setLocked(w.getLocked());
        vo.setCreatedAt(w.getCreatedAt());
        vo.setUpdatedAt(w.getUpdatedAt());

        if (w.getFlightId() != null) {
            flightRepository.findById(w.getFlightId()).ifPresent(f -> vo.setFlightNo(f.getFlightNo()));
        }
        if (w.getCurrentUldId() != null) {
            uldRepository.findById(w.getCurrentUldId()).ifPresent(u -> vo.setCurrentUldCode(u.getUldCode()));
        }
        if (w.getInspectedBy() != null) {
            userRepository.findById(w.getInspectedBy()).ifPresent(u -> vo.setInspectedByName(u.getRealName()));
        }
        if (w.getCreatedBy() != null) {
            userRepository.findById(w.getCreatedBy()).ifPresent(u -> vo.setCreatedByName(u.getRealName()));
        }
        return vo;
    }
}
