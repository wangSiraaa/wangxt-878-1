package com.cargo.uld.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "load_record")
public class LoadRecord {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "waybill_id", nullable = false)
    private Long waybillId;

    @Column(name = "uld_id", nullable = false)
    private Long uldId;

    @Column(name = "operation_type", nullable = false, length = 16)
    private String operationType;

    @Column(name = "pieces", nullable = false)
    private Integer pieces;

    @Column(name = "weight", nullable = false, precision = 12, scale = 2)
    private BigDecimal weight;

    @Column(name = "operator_id", nullable = false)
    private Long operatorId;

    @Column(name = "remark", length = 500)
    private String remark;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    public interface OperationType {
        String LOAD = "LOAD";
        String UNLOAD = "UNLOAD";
    }
}
