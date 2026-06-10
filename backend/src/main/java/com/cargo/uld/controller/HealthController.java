package com.cargo.uld.controller;

import com.cargo.uld.common.Result;
import com.cargo.uld.repository.AuditLogRepository;
import com.cargo.uld.repository.FlightRepository;
import com.cargo.uld.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import javax.sql.DataSource;
import java.sql.Connection;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping({"/health", "/actuator/health"})
@RequiredArgsConstructor
public class HealthController {

    private final DataSource dataSource;
    private final UserRepository userRepository;
    private final FlightRepository flightRepository;
    private final AuditLogRepository auditLogRepository;

    @GetMapping
    public Result<Map<String, Object>> health() {
        Map<String, Object> info = new HashMap<>();
        info.put("status", "UP");
        info.put("timestamp", System.currentTimeMillis());
        info.put("service", "cargo-uld-review");

        try (Connection conn = dataSource.getConnection()) {
            boolean dbOk = conn.isValid(2);
            info.put("database", dbOk ? "UP" : "DOWN");
        } catch (Exception e) {
            info.put("database", "DOWN");
            info.put("database_error", e.getMessage());
            info.put("status", "DEGRADED");
        }

        try {
            info.put("userCount", userRepository.count());
            info.put("flightCount", flightRepository.count());
            info.put("auditLogCount", auditLogRepository.count());
        } catch (Exception ignored) {
        }

        return Result.success(info);
    }

    @GetMapping("/liveness")
    public Result<String> liveness() {
        return Result.success("OK");
    }

    @GetMapping("/readiness")
    public Result<String> readiness() {
        try (Connection conn = dataSource.getConnection()) {
            if (conn.isValid(2)) {
                return Result.success("READY");
            }
        } catch (Exception e) {
            return Result.error(503, "数据库不可用");
        }
        return Result.error(503, "系统未就绪");
    }
}
