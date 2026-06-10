package com.cargo.uld.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "waybill")
public class Waybill {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "waybill_no", nullable = false, unique = true, length = 64)
    private String waybillNo;

    @Column(name = "flight_id")
    private Long flightId;

    @Column(name = "shipper", length = 128)
    private String shipper;

    @Column(name = "consignee", length = 128)
    private String consignee;

    @Column(name = "pieces", nullable = false)
    private Integer pieces;

    @Column(name = "weight", nullable = false, precision = 12, scale = 2)
    private BigDecimal weight;

    @Column(name = "volume", precision = 12, scale = 4)
    private BigDecimal volume;

    @Column(name = "goods_description", length = 500)
    private String goodsDescription;

    @Column(name = "dangerous_flag")
    private Boolean dangerousFlag = false;

    @Column(name = "dangerous_level", length = 8)
    private String dangerousLevel;

    @Column(name = "security_status", nullable = false, length = 32)
    private String securityStatus = SecurityStatus.PENDING;

    @Column(name = "inspected_by")
    private Long inspectedBy;

    @Column(name = "inspected_at")
    private LocalDateTime inspectedAt;

    @Column(name = "security_remark", length = 500)
    private String securityRemark;

    @Column(name = "loaded_status", nullable = false, length = 32)
    private String loadedStatus = LoadedStatus.UNLOADED;

    @Column(name = "current_uld_id")
    private Long currentUldId;

    @Column(name = "locked")
    private Boolean locked = false;

    @Column(name = "remark", length = 1000)
    private String remark;

    @Column(name = "created_by", nullable = false)
    private Long createdBy;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public interface SecurityStatus {
        String PENDING = "PENDING";
        String PASSED = "PASSED";
        String REJECTED = "REJECTED";
    }

    public interface LoadedStatus {
        String UNLOADED = "UNLOADED";
        String LOADED = "LOADED";
        String UNLOADED_REVIEW = "UNLOADED_REVIEW";
    }
}
