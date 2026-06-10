package com.cargo.uld.service;

import com.cargo.uld.common.BusinessException;
import com.cargo.uld.common.PageResult;
import com.cargo.uld.dto.FlightRequest;
import com.cargo.uld.dto.FlightVO;
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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FlightService {

    private final FlightRepository flightRepository;
    private final UldRepository uldRepository;
    private final WaybillRepository waybillRepository;
    private final UserRepository userRepository;

    private static final Map<String, String> STATUS_MAP = Map.of(
            Flight.Status.CREATED, "已建档",
            Flight.Status.LOADING, "装板中",
            Flight.Status.CLOSED, "已关闭"
    );

    public PageResult<FlightVO> queryPage(String flightNo, String status, Pageable pageable) {
        Page<Flight> page;
        if (StringUtils.hasText(flightNo)) {
            flightNo = "%" + flightNo + "%";
            if (StringUtils.hasText(status)) {
                page = flightRepository.findAll((root, query, cb) -> cb.and(
                        cb.like(root.get("flightNo"), flightNo),
                        cb.equal(root.get("status"), status)
                ), pageable);
            } else {
                page = flightRepository.findAll((root, query, cb) -> cb.like(root.get("flightNo"), flightNo), pageable);
            }
        } else if (StringUtils.hasText(status)) {
            page = flightRepository.findByStatus(status, pageable);
        } else {
            page = flightRepository.findAll(pageable);
        }

        List<FlightVO> voList = page.getContent().stream()
                .map(this::toVO)
                .collect(Collectors.toList());

        return new PageResult<>(page.getTotalElements(), voList, pageable.getPageNumber() + 1, pageable.getPageSize());
    }

    @Transactional
    public Flight create(FlightRequest request) {
        if (flightRepository.existsByFlightNo(request.getFlightNo())) {
            throw BusinessException.of("航班号已存在：" + request.getFlightNo());
        }
        Flight flight = new Flight();
        flight.setFlightNo(request.getFlightNo());
        flight.setAircraftNo(request.getAircraftNo());
        flight.setDeparture(request.getDeparture());
        flight.setArrival(request.getArrival());
        flight.setScheduledDeparture(request.getScheduledDeparture());
        flight.setTotalUldLimit(request.getTotalUldLimit());
        flight.setTotalWeightLimit(request.getTotalWeightLimit());
        flight.setStatus(Flight.Status.CREATED);
        flight.setCreatedBy(SecurityUtil.getCurrentUserId());
        return flightRepository.save(flight);
    }

    public FlightVO getDetail(Long id) {
        Flight flight = flightRepository.findById(id)
                .orElseThrow(() -> BusinessException.of("航班不存在"));
        return toVO(flight);
    }

    @Transactional
    public Flight update(Long id, FlightRequest request) {
        Flight flight = flightRepository.findById(id)
                .orElseThrow(() -> BusinessException.of("航班不存在"));
        validateStatus(flight.getStatus());
        if (!flight.getFlightNo().equals(request.getFlightNo())
                && flightRepository.existsByFlightNo(request.getFlightNo())) {
            throw BusinessException.of("航班号已存在：" + request.getFlightNo());
        }
        flight.setFlightNo(request.getFlightNo());
        flight.setAircraftNo(request.getAircraftNo());
        flight.setDeparture(request.getDeparture());
        flight.setArrival(request.getArrival());
        flight.setScheduledDeparture(request.getScheduledDeparture());
        flight.setTotalUldLimit(request.getTotalUldLimit());
        flight.setTotalWeightLimit(request.getTotalWeightLimit());
        return flightRepository.save(flight);
    }

    @Transactional
    public void delete(Long id) {
        Flight flight = flightRepository.findById(id)
                .orElseThrow(() -> BusinessException.of("航班不存在"));
        List<Uld> ulds = uldRepository.findByFlightId(id);
        if (!ulds.isEmpty()) {
            throw BusinessException.of("航班下已关联板箱，不能删除");
        }
        List<Waybill> waybills = waybillRepository.findByFlightId(id);
        if (!waybills.isEmpty()) {
            throw BusinessException.of("航班下已关联货邮单，不能删除");
        }
        flightRepository.delete(flight);
    }

    @Transactional
    public Flight closeFlight(Long id) {
        if (!SecurityUtil.isSupervisor()) {
            throw BusinessException.of(403, "无权限操作，仅SUPERVISOR可关闭航班");
        }
        Flight flight = flightRepository.findById(id)
                .orElseThrow(() -> BusinessException.of("航班不存在"));
        if (Flight.Status.CLOSED.equals(flight.getStatus())) {
            throw BusinessException.of("航班已关闭");
        }

        List<Uld> ulds = uldRepository.findByFlightId(id);
        for (Uld uld : ulds) {
            List<Waybill> loadedWaybills = waybillRepository
                    .findByCurrentUldIdAndLoadedStatus(uld.getId(), Waybill.LoadedStatus.LOADED);
            if (!loadedWaybills.isEmpty() && !Uld.ReviewStatus.PASSED.equals(uld.getReviewStatus())) {
                throw BusinessException.of("板箱[" + uld.getUldCode() + "]下已装货但未复核通过，无法关闭航班");
            }
        }

        flight.setStatus(Flight.Status.CLOSED);
        flight.setClosedAt(LocalDateTime.now());
        flight.setClosedBy(SecurityUtil.getCurrentUserId());
        return flightRepository.save(flight);
    }

    private void validateStatus(String currentStatus) {
        if (Flight.Status.CLOSED.equals(currentStatus)) {
            throw BusinessException.of("航班已关闭，不能修改");
        }
    }

    private FlightVO toVO(Flight flight) {
        FlightVO vo = new FlightVO();
        vo.setId(flight.getId());
        vo.setFlightNo(flight.getFlightNo());
        vo.setAircraftNo(flight.getAircraftNo());
        vo.setDeparture(flight.getDeparture());
        vo.setArrival(flight.getArrival());
        vo.setScheduledDeparture(flight.getScheduledDeparture());
        vo.setStatus(flight.getStatus());
        vo.setStatusName(STATUS_MAP.getOrDefault(flight.getStatus(), flight.getStatus()));
        vo.setTotalUldLimit(flight.getTotalUldLimit());
        vo.setTotalWeightLimit(flight.getTotalWeightLimit());
        vo.setClosedAt(flight.getClosedAt());
        vo.setClosedBy(flight.getClosedBy());
        vo.setCreatedBy(flight.getCreatedBy());
        vo.setCreatedAt(flight.getCreatedAt());
        vo.setUpdatedAt(flight.getUpdatedAt());

        if (flight.getCreatedBy() != null) {
            userRepository.findById(flight.getCreatedBy()).ifPresent(u -> vo.setCreatedByName(u.getRealName()));
        }
        if (flight.getClosedBy() != null) {
            userRepository.findById(flight.getClosedBy()).ifPresent(u -> vo.setClosedByName(u.getRealName()));
        }
        return vo;
    }
}
