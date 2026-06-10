package com.cargo.uld.aspect;

import com.cargo.uld.annotation.AuditLog;
import com.cargo.uld.repository.AuditLogRepository;
import com.cargo.uld.security.SecurityUtil;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.*;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.lang.reflect.Method;
import java.lang.reflect.Parameter;

@Aspect
@Component
@RequiredArgsConstructor
@Slf4j
public class AuditAspect {

    private final AuditLogRepository auditLogRepository;
    private final ObjectMapper objectMapper;

    @Pointcut("@annotation(com.cargo.uld.annotation.AuditLog)")
    public void auditLogPointcut() {
    }

    @AfterReturning(pointcut = "auditLogPointcut()", returning = "result")
    public void afterReturning(JoinPoint joinPoint, Object result) {
        saveAuditLog(joinPoint, result, null);
    }

    @AfterThrowing(pointcut = "auditLogPointcut()", throwing = "ex")
    public void afterThrowing(JoinPoint joinPoint, Throwable ex) {
        saveAuditLog(joinPoint, null, ex);
    }

    @Async
    protected void saveAuditLog(JoinPoint joinPoint, Object result, Throwable ex) {
        try {
            MethodSignature signature = (MethodSignature) joinPoint.getSignature();
            Method method = signature.getMethod();
            AuditLog auditAnnotation = method.getAnnotation(AuditLog.class);

            String operation = auditAnnotation.operation();
            if (operation.isEmpty()) {
                operation = method.getName();
            }
            String targetType = auditAnnotation.targetType();

            Long targetId = extractTargetId(joinPoint);

            com.cargo.uld.entity.AuditLog auditLog = new com.cargo.uld.entity.AuditLog();
            auditLog.setUserId(SecurityUtil.getCurrentUserId());
            auditLog.setUsername(SecurityUtil.getCurrentUsername());
            auditLog.setOperation(operation);
            auditLog.setTargetType(targetType);
            auditLog.setTargetId(targetId);
            auditLog.setBeforeContent(extractArgs(joinPoint));
            if (result != null) {
                try {
                    auditLog.setAfterContent(objectMapper.writeValueAsString(result));
                } catch (Exception e) {
                    auditLog.setAfterContent(String.valueOf(result));
                }
            }
            if (ex != null) {
                auditLog.setAfterContent("EXCEPTION: " + ex.getMessage());
            }
            auditLog.setIpAddress(getClientIp());

            auditLogRepository.save(auditLog);
        } catch (Exception e) {
            log.error("保存审计日志失败", e);
        }
    }

    private Long extractTargetId(JoinPoint joinPoint) {
        try {
            Object[] args = joinPoint.getArgs();
            Parameter[] parameters = ((MethodSignature) joinPoint.getSignature()).getMethod().getParameters();
            for (int i = 0; i < parameters.length; i++) {
                if ("id".equals(parameters[i].getName())
                        || "uldId".equals(parameters[i].getName())
                        || "flightId".equals(parameters[i].getName())
                        || "waybillId".equals(parameters[i].getName())) {
                    if (args[i] instanceof Long) {
                        return (Long) args[i];
                    }
                }
            }
        } catch (Exception ignored) {
        }
        return null;
    }

    private String extractArgs(JoinPoint joinPoint) {
        try {
            Object[] args = joinPoint.getArgs();
            if (args.length == 0) {
                return null;
            }
            StringBuilder sb = new StringBuilder();
            Parameter[] parameters = ((MethodSignature) joinPoint.getSignature()).getMethod().getParameters();
            for (int i = 0; i < Math.min(args.length, parameters.length); i++) {
                if (i > 0) sb.append(", ");
                sb.append(parameters[i].getName()).append("=");
                try {
                    sb.append(objectMapper.writeValueAsString(args[i]));
                } catch (Exception e) {
                    sb.append(String.valueOf(args[i]));
                }
            }
            return sb.toString();
        } catch (Exception e) {
            return null;
        }
    }

    private String getClientIp() {
        try {
            ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attributes != null) {
                HttpServletRequest request = attributes.getRequest();
                String ip = request.getHeader("X-Forwarded-For");
                if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
                    ip = request.getHeader("Proxy-Client-IP");
                }
                if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
                    ip = request.getHeader("WL-Proxy-Client-IP");
                }
                if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
                    ip = request.getRemoteAddr();
                }
                if (ip != null && ip.contains(",")) {
                    ip = ip.split(",")[0].trim();
                }
                return ip;
            }
        } catch (Exception ignored) {
        }
        return null;
    }
}
