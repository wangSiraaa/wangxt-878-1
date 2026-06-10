package com.cargo.uld.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class ReviewPassRequest {
    @NotNull(message = "实际复核重量不能为空")
    @DecimalMin(value = "0", message = "实际复核重量不能为负数")
    private BigDecimal actualWeight;
    private String remark;
}
