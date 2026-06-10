package com.cargo.uld.controller;

import com.cargo.uld.annotation.AuditLog;
import com.cargo.uld.common.PageResult;
import com.cargo.uld.common.Result;
import com.cargo.uld.dto.FlightRequest;
import com.cargo.uld.dto.FlightVO;
import com.cargo.uld.entity.Flight;
import com.cargo.uld.service.FlightService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/flight")
@RequiredArgsConstructor
public class FlightController {

    private final FlightService flightService;

    @GetMapping
    public Result<PageResult<FlightVO>> page(
            @RequestParam(required = false) String flightNo,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer size) {
        Pageable pageable = PageRequest.of(page - 1, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return Result.success(flightService.queryPage(flightNo, status, pageable));
    }

    @AuditLog(operation = "创建航班", targetType = "FLIGHT")
    @PostMapping
    public Result<Flight> create(@Valid @RequestBody FlightRequest request) {
        return Result.success(flightService.create(request));
    }

    @GetMapping("/{id}")
    public Result<FlightVO> getDetail(@PathVariable Long id) {
        return Result.success(flightService.getDetail(id));
    }

    @AuditLog(operation = "修改航班", targetType = "FLIGHT")
    @PutMapping("/{id}")
    public Result<Flight> update(@PathVariable Long id, @Valid @RequestBody FlightRequest request) {
        return Result.success(flightService.update(id, request));
    }

    @AuditLog(operation = "删除航班", targetType = "FLIGHT")
    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        flightService.delete(id);
        return Result.success();
    }

    @AuditLog(operation = "关闭航班", targetType = "FLIGHT")
    @PutMapping("/{id}/close")
    public Result<Flight> close(@PathVariable Long id) {
        return Result.success(flightService.closeFlight(id));
    }
}
