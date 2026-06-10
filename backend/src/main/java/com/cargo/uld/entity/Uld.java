package com.cargo.uld.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "uld")
public class Uld {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "uld_code", nullable = false, unique = true, length = 32)
    private String uldCode;

    @Column(name = "uld_type", nullable = false, length = 16)
    private String uldType;

    @Column(name = "flight_id")
    private Long flightId;

    @Column(name = "weight_limit", nullable = false, precision = 12, scale = 2)
    private BigDecimal weightLimit;

    @Column(name = "current_weight", precision = 12, scale = 2)
    private BigDecimal currentWeight = BigDecimal.ZERO;

    @Column(name = "tare_weight", precision = 12, scale = 2)
    private BigDecimal tareWeight = BigDecimal.ZERO;

    @Column(name = "review_status", nullable = false, length = 32)
    private String reviewStatus = ReviewStatus.PENDING;

    @Column(name = "locked")
    private Boolean locked = false;

    @Column(name = "reject_reason", length = 500)
    private String rejectReason;

    @Column(name = "reviewed_by")
    private Long reviewedBy;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    @Column(name = "created_by", nullable = false)
    private Long createdBy;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Version
    @Column(name = "version")
    private Integer version = 0;

    public interface ReviewStatus {
        String PENDING = "PENDING";
        String REVIEWING = "REVIEWING";
        String PASSED = "PASSED";
        String REJECTED = "REJECTED";
    }
}
