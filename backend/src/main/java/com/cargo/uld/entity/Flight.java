package com.cargo.uld.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "flight")
public class Flight {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "flight_no", nullable = false, unique = true, length = 32)
    private String flightNo;

    @Column(name = "aircraft_no", length = 32)
    private String aircraftNo;

    @Column(name = "departure", nullable = false, length = 16)
    private String departure;

    @Column(name = "arrival", nullable = false, length = 16)
    private String arrival;

    @Column(name = "scheduled_departure", nullable = false)
    private LocalDateTime scheduledDeparture;

    @Column(name = "status", nullable = false, length = 32)
    private String status = Status.CREATED;

    @Column(name = "total_uld_limit")
    private Integer totalUldLimit = 0;

    @Column(name = "total_weight_limit", precision = 12, scale = 2)
    private BigDecimal totalWeightLimit = BigDecimal.ZERO;

    @Column(name = "closed_at")
    private LocalDateTime closedAt;

    @Column(name = "closed_by")
    private Long closedBy;

    @Column(name = "created_by", nullable = false)
    private Long createdBy;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public interface Status {
        String CREATED = "CREATED";
        String LOADING = "LOADING";
        String CLOSED = "CLOSED";
    }
}
