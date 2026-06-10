package com.cargo.uld.service;

import com.cargo.uld.common.BusinessException;
import com.cargo.uld.common.PageResult;
import com.cargo.uld.dto.UldDetailVO;
import com.cargo.uld.dto.UldRequest;
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

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UldService {

    private final UldRepository uldRepository;
    private final FlightRepository flightRepository;
    private final WaybillRepository waybillRepository;
    private final UserRepository userRepository;

    public PageResult<UldDetailVO> queryPage(String uldCode, Long flightId, String reviewStatus, Pageable pageable) {
        Specification<Uld> spec = (root, query, cb) -> {
            List<jakarta.persistence.criteria.Predicate> predicates = new ArrayList<>();
            if (StringUtils.hasText(uldCode)) {
                predicates.add(cb.like(root.get("uldCode"), "%" + uldCode + "%"));
            }
            if (flightId != null) {
                predicates.add(cb.equal(root.get("flightId"), flightId));
            }
            if (StringUtils.hasText(reviewStatus)) {
                predicates.add(cb.equal(root.get("reviewStatus"), reviewStatus));
            }
            return cb.and(predicates.toArray(new jakarta.persistence.criteria.Predicate[0]));
        };

        Page<Uld> page = uldRepository.findAll(spec, pageable);
        List<UldDetailVO> voList = page.getContent().stream()
                .map(this::toDetailVO)
                .collect(Collectors.toList());

        return new PageResult<>(page.getTotalElements(), voList,
                pageable.getPageNumber() + 1, pageable.getPageSize());
    }

    @Transactional
    public Uld create(UldRequest request) {
        if (uldRepository.existsByUldCode(request.getUldCode())) {
            throw BusinessException.of("板箱号已存在：" + request.getUldCode());
        }
        Uld uld = new Uld();
        uld.setUldCode(request.getUldCode());
        uld.setUldType(request.getUldType());
        uld.setFlightId(request.getFlightId());
        uld.setWeightLimit(request.getWeightLimit());
        uld.setTareWeight(request.getTareWeight() != null ? request.getTareWeight() : BigDecimal.ZERO);
        uld.setCreatedBy(SecurityUtil.getCurrentUserId());
        return uldRepository.save(uld);
    }

    public UldDetailVO getDetail(Long id) {
        Uld uld = uldRepository.findById(id)
                .orElseThrow(() -> BusinessException.of("板箱不存在"));
        UldDetailVO vo = toDetailVO(uld);
        List<Waybill> loadedWaybills = waybillRepository.findByCurrentUldId(id);
        List<WaybillVO> waybillVOList = loadedWaybills.stream()
                .map(this::toWaybillVO)
                .collect(Collectors.toList());
        vo.setWaybills(waybillVOList);
        return vo;
    }

    @Transactional
    public Uld update(Long id, UldRequest request) {
        Uld uld = uldRepository.findById(id)
                .orElseThrow(() -> BusinessException.of("板箱不存在"));
        if (Boolean.TRUE.equals(uld.getLocked())) {
            throw BusinessException.of("板箱已锁定，不能修改");
        }
        if (!uld.getUldCode().equals(request.getUldCode())
                && uldRepository.existsByUldCode(request.getUldCode())) {
            throw BusinessException.of("板箱号已存在：" + request.getUldCode());
        }
        uld.setUldCode(request.getUldCode());
        uld.setUldType(request.getUldType());
        uld.setWeightLimit(request.getWeightLimit());
        uld.setTareWeight(request.getTareWeight() != null ? request.getTareWeight() : BigDecimal.ZERO);
        return uldRepository.save(uld);
    }

    @Transactional
    public void delete(Long id) {
        Uld uld = uldRepository.findById(id)
                .orElseThrow(() -> BusinessException.of("板箱不存在"));
        if (Boolean.TRUE.equals(uld.getLocked())) {
            throw BusinessException.of("板箱已锁定，不能删除");
        }
        if (uld.getCurrentWeight() != null && uld.getCurrentWeight().compareTo(BigDecimal.ZERO) > 0) {
            throw BusinessException.of("板箱内已装货，不能删除");
        }
        boolean hasLoaded = waybillRepository.existsByCurrentUldIdAndLoadedStatus(id, Waybill.LoadedStatus.LOADED);
        if (hasLoaded) {
            throw BusinessException.of("板箱下存在已装货邮单，不能删除");
        }
        uldRepository.delete(uld);
    }

    @Transactional
    public Uld assignFlight(Long id, Long flightId) {
        Uld uld = uldRepository.findById(id)
                .orElseThrow(() -> BusinessException.of("板箱不存在"));
        checkAssignable(uld);
        if (flightId != null) {
            Flight flight = flightRepository.findById(flightId)
                    .orElseThrow(() -> BusinessException.of("航班不存在"));
            if (Flight.Status.CLOSED.equals(flight.getStatus())) {
                throw BusinessException.of("航班已关闭，不能分配板箱");
            }
        }
        uld.setFlightId(flightId);
        return uldRepository.save(uld);
    }

    private void checkAssignable(Uld uld) {
        if (Boolean.TRUE.equals(uld.getLocked())) {
            throw BusinessException.of("板箱已锁定，不能分配/取消分配航班");
        }
        if (!Uld.ReviewStatus.PENDING.equals(uld.getReviewStatus())
                && !Uld.ReviewStatus.REJECTED.equals(uld.getReviewStatus())) {
            throw BusinessException.of("板箱复核状态为" + uld.getReviewStatus() + "，不能分配航班");
        }
    }

    private UldDetailVO toDetailVO(Uld u) {
        UldDetailVO vo = new UldDetailVO();
        vo.setId(u.getId());
        vo.setUldCode(u.getUldCode());
        vo.setUldType(u.getUldType());
        vo.setFlightId(u.getFlightId());
        vo.setWeightLimit(u.getWeightLimit());
        vo.setCurrentWeight(u.getCurrentWeight());
        vo.setTareWeight(u.getTareWeight());
        vo.setReviewStatus(u.getReviewStatus());
        vo.setLocked(u.getLocked());
        vo.setRejectReason(u.getRejectReason());
        vo.setReviewedBy(u.getReviewedBy());
        vo.setReviewedAt(u.getReviewedAt());

        if (u.getFlightId() != null) {
            flightRepository.findById(u.getFlightId()).ifPresent(f -> vo.setFlightNo(f.getFlightNo()));
        }
        if (u.getCreatedBy() != null) {
            userRepository.findById(u.getCreatedBy()).ifPresent(user -> {
            });
        }
        BigDecimal usedRatio = BigDecimal.ZERO;
        if (u.getWeightLimit() != null && u.getWeightLimit().compareTo(BigDecimal.ZERO) > 0
                && u.getCurrentWeight() != null) {
            usedRatio = u.getCurrentWeight().divide(u.getWeightLimit(), 4, RoundingMode.HALF_UP);
        }
        vo.setUsedRatio(usedRatio);
        return vo;
    }

    private WaybillVO toWaybillVO(Waybill w) {
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
