package com.cargo.uld.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ReviewRecordVO {
    private Long id;
    private Long uldId;
    private String uldCode;
    private String reviewType;
    private String reviewTypeName;
    private BigDecimal expectedWeight;
    private BigDecimal actualWeight;
    private BigDecimal weightDiff;
    private Long reviewerId;
    private String reviewerName;
    private String rejectReason;
    private String unlockToStatus;
    private String remark;
    private LocalDateTime createdAt;
}
