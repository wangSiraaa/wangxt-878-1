package com.cargo.uld.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class FlightRequest {
    @NotBlank(message = "航班号不能为空")
    private String flightNo;
    private String aircraftNo;
    @NotBlank(message = "出发站不能为空")
    private String departure;
    @NotBlank(message = "到达站不能为空")
    private String arrival;
    @NotNull(message = "计划起飞时间不能为空")
    private LocalDateTime scheduledDeparture;
    @Min(value = 0, message = "板箱限额不能为负数")
    private Integer totalUldLimit = 0;
    @DecimalMin(value = "0", message = "总重量限额不能为负数")
    private BigDecimal totalWeightLimit = BigDecimal.ZERO;
}
