package com.cargo.uld.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class SecurityCheckRequest {
    @NotBlank(message = "安检状态不能为空")
    private String status;
    private String remark;
}
