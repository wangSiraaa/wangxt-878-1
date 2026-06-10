package com.cargo.uld.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class WaybillVO {
    private Long id;
    private String waybillNo;
    private Long flightId;
    private String flightNo;
    private String shipper;
    private String consignee;
    private Integer pieces;
    private BigDecimal weight;
    private BigDecimal volume;
    private String goodsDescription;
    private Boolean dangerousFlag;
    private String dangerousLevel;
    private String securityStatus;
    private Long inspectedBy;
    private String inspectedByName;
    private LocalDateTime inspectedAt;
    private String securityRemark;
    private String loadedStatus;
    private Long currentUldId;
    private String currentUldCode;
    private Boolean locked;
    private String createdByName;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
