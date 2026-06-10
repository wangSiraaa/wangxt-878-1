package com.cargo.uld.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class LoadRequest {
    @NotNull(message = "货邮单ID不能为空")
    private Long waybillId;
    @NotNull(message = "板箱ID不能为空")
    private Long uldId;
    private String remark;
}
