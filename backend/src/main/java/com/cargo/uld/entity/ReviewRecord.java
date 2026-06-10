package com.cargo.uld.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "review_record")
public class ReviewRecord {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "uld_id", nullable = false)
    private Long uldId;

    @Column(name = "review_type", nullable = false, length = 16)
    private String reviewType;

    @Column(name = "expected_weight", precision = 12, scale = 2)
    private BigDecimal expectedWeight;

    @Column(name = "actual_weight", precision = 12, scale = 2)
    private BigDecimal actualWeight;

    @Column(name = "weight_diff", precision = 12, scale = 2)
    private BigDecimal weightDiff;

    @Column(name = "reviewer_id", nullable = false)
    private Long reviewerId;

    @Column(name = "reject_reason", length = 500)
    private String rejectReason;

    @Column(name = "unlock_to_status", length = 32)
    private String unlockToStatus;

    @Column(name = "remark", length = 500)
    private String remark;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    public interface ReviewType {
        String SUBMIT = "SUBMIT";
        String PASS = "PASS";
        String REJECT = "REJECT";
    }
}
