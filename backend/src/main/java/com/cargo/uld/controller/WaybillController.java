package com.cargo.uld.controller;

import com.cargo.uld.annotation.AuditLog;
import com.cargo.uld.common.PageResult;
import com.cargo.uld.common.Result;
import com.cargo.uld.dto.SecurityCheckRequest;
import com.cargo.uld.dto.WaybillRequest;
import com.cargo.uld.dto.WaybillVO;
import com.cargo.uld.entity.Waybill;
import com.cargo.uld.service.WaybillService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/waybill")
@RequiredArgsConstructor
public class WaybillController {

    private final WaybillService waybillService;

    @GetMapping
    public Result<PageResult<WaybillVO>> page(
            @RequestParam(required = false) String waybillNo,
            @RequestParam(required = false) Long flightId,
            @RequestParam(required = false) String securityStatus,
            @RequestParam(required = false) String loadedStatus,
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer size) {
        Pageable pageable = PageRequest.of(page - 1, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return Result.success(waybillService.queryPage(waybillNo, flightId, securityStatus, loadedStatus, pageable));
    }

    @AuditLog(operation = "创建货邮单", targetType = "WAYBILL")
    @PostMapping
    public Result<Waybill> create(@Valid @RequestBody WaybillRequest request) {
        return Result.success(waybillService.create(request));
    }

    @GetMapping("/{id}")
    public Result<WaybillVO> getDetail(@PathVariable Long id) {
        return Result.success(waybillService.getDetail(id));
    }

    @AuditLog(operation = "修改货邮单", targetType = "WAYBILL")
    @PutMapping("/{id}")
    public Result<Waybill> update(@PathVariable Long id, @Valid @RequestBody WaybillRequest request) {
        return Result.success(waybillService.update(id, request));
    }

    @AuditLog(operation = "删除货邮单", targetType = "WAYBILL")
    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        waybillService.delete(id);
        return Result.success();
    }

    @AuditLog(operation = "货邮单安检", targetType = "WAYBILL")
    @PutMapping("/{id}/security")
    public Result<Waybill> securityCheck(@PathVariable Long id,
                                          @Valid @RequestBody SecurityCheckRequest request) {
        return Result.success(waybillService.securityCheck(id, request));
    }
}
