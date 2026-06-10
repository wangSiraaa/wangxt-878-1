package com.cargo.uld.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class FlightVO {
    private Long id;
    private String flightNo;
    private String aircraftNo;
    private String departure;
    private String arrival;
    private LocalDateTime scheduledDeparture;
    private String status;
    private String statusName;
    private Integer totalUldLimit;
    private BigDecimal totalWeightLimit;
    private LocalDateTime closedAt;
    private Long closedBy;
    private String closedByName;
    private Long createdBy;
    private String createdByName;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
