package com.cargo.uld.controller;

import com.cargo.uld.annotation.AuditLog;
import com.cargo.uld.common.PageResult;
import com.cargo.uld.common.Result;
import com.cargo.uld.dto.LoadRequest;
import com.cargo.uld.dto.ReviewPassRequest;
import com.cargo.uld.dto.ReviewRejectRequest;
import com.cargo.uld.dto.UldDetailVO;
import com.cargo.uld.dto.UldRequest;
import com.cargo.uld.dto.UnloadRequest;
import com.cargo.uld.entity.Uld;
import com.cargo.uld.service.LoadService;
import com.cargo.uld.service.ReviewService;
import com.cargo.uld.service.UldService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/uld")
@RequiredArgsConstructor
public class UldController {

    private final UldService uldService;
    private final LoadService loadService;
    private final ReviewService reviewService;

    @GetMapping
    public Result<PageResult<UldDetailVO>> page(
            @RequestParam(required = false) String uldNo,
            @RequestParam(required = false) Long flightId,
            @RequestParam(required = false) String reviewStatus,
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer size) {
        String uldCode = uldNo;
        Pageable pageable = PageRequest.of(page - 1, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return Result.success(uldService.queryPage(uldCode, flightId, reviewStatus, pageable));
    }

    @AuditLog(operation = "创建板箱", targetType = "ULD")
    @PostMapping
    public Result<Uld> create(@Valid @RequestBody UldRequest request) {
        return Result.success(uldService.create(request));
    }

    @GetMapping("/{id}")
    public Result<UldDetailVO> getDetail(@PathVariable Long id) {
        return Result.success(uldService.getDetail(id));
    }

    @AuditLog(operation = "修改板箱", targetType = "ULD")
    @PutMapping("/{id}")
    public Result<Uld> update(@PathVariable Long id, @Valid @RequestBody UldRequest request) {
        return Result.success(uldService.update(id, request));
    }

    @AuditLog(operation = "删除板箱", targetType = "ULD")
    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        uldService.delete(id);
        return Result.success();
    }

    @AuditLog(operation = "分配板箱航班", targetType = "ULD")
    @PostMapping("/{id}/assign-flight")
    public Result<Uld> assignFlight(@PathVariable Long id, @RequestParam(required = false) Long flightId) {
        return Result.success(uldService.assignFlight(id, flightId));
    }

    @AuditLog(operation = "装板", targetType = "ULD")
    @PostMapping("/load")
    public Result<Void> loadWaybill(@Valid @RequestBody LoadRequest request) {
        loadService.loadWaybill(request);
        return Result.success();
    }

    @AuditLog(operation = "卸下", targetType = "ULD")
    @PostMapping("/unload")
    public Result<Void> unloadWaybill(@Valid @RequestBody UnloadRequest request) {
        loadService.unloadWaybill(request);
        return Result.success();
    }

    @AuditLog(operation = "提交复核", targetType = "ULD")
    @PostMapping("/{id}/review/submit")
    public Result<Void> submitReview(@PathVariable("id") Long uldId) {
        reviewService.submitForReview(uldId);
        return Result.success();
    }

    @AuditLog(operation = "复核通过", targetType = "ULD")
    @PutMapping("/{id}/review/pass")
    public Result<Void> passReview(@PathVariable("id") Long uldId,
                                    @Valid @RequestBody ReviewPassRequest request) {
        reviewService.passReview(uldId, request);
        return Result.success();
    }

    @AuditLog(operation = "复核退回", targetType = "ULD")
    @PutMapping("/{id}/review/reject")
    public Result<Void> rejectReview(@PathVariable("id") Long uldId,
                                      @Valid @RequestBody ReviewRejectRequest request) {
        reviewService.rejectReview(uldId, request);
        return Result.success();
    }
}
