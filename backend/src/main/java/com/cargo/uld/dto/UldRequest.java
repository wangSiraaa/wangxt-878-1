package com.cargo.uld.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class UldRequest {
    @NotBlank(message = "板箱号不能为空")
    private String uldCode;
    @NotBlank(message = "板箱类型不能为空")
    private String uldType;
    private Long flightId;
    @NotNull(message = "限重不能为空")
    @DecimalMin(value = "0.01", message = "限重必须大于0")
    private BigDecimal weightLimit;
    private BigDecimal tareWeight = BigDecimal.ZERO;
}
