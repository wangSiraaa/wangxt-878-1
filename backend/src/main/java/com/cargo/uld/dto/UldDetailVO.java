package com.cargo.uld.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UldDetailVO {
    private Long id;
    private String uldCode;
    private String uldType;
    private Long flightId;
    private String flightNo;
    private BigDecimal weightLimit;
    private BigDecimal currentWeight;
    private BigDecimal tareWeight;
    private String reviewStatus;
    private Boolean locked;
    private String rejectReason;
    private Long reviewedBy;
    private LocalDateTime reviewedAt;
    private BigDecimal usedRatio;
    private List<WaybillVO> waybills;
}
