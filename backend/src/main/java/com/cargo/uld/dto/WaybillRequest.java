package com.cargo.uld.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class WaybillRequest {
    @NotBlank(message = "货邮单号不能为空")
    private String waybillNo;
    private Long flightId;
    private String shipper;
    private String consignee;
    @NotNull(message = "件数不能为空")
    @Min(value = 1, message = "件数必须大于0")
    private Integer pieces;
    @NotNull(message = "重量不能为空")
    @DecimalMin(value = "0.01", message = "重量必须大于0")
    private BigDecimal weight;
    private BigDecimal volume;
    private String goodsDescription;
    private Boolean dangerousFlag = false;
    private String dangerousLevel;
    private String remark;
}
