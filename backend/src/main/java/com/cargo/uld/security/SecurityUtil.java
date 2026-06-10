package com.cargo.uld.security;

import com.cargo.uld.entity.User;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Component
public class SecurityUtil {

    public static Long getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof CustomUserDetails ud) {
            return ud.getUserId();
        }
        return null;
    }

    public static String getCurrentUsername() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof CustomUserDetails ud) {
            return ud.getUsername();
        }
        return null;
    }

    public static String getCurrentRole() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof CustomUserDetails ud) {
            return ud.getRole();
        }
        return null;
    }

    public static String getCurrentRealName() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof CustomUserDetails ud) {
            return ud.getRealName();
        }
        return null;
    }

    public static boolean hasRole(String role) {
        return role.equals(getCurrentRole());
    }

    public static boolean isSupervisor() {
        return User.Role.SUPERVISOR.equals(getCurrentRole());
    }

    public static boolean isReviewer() {
        return User.Role.REVIEWER.equals(getCurrentRole());
    }

    public static boolean isInspector() {
        return User.Role.INSPECTOR.equals(getCurrentRole());
    }

    public static boolean isOperator() {
        return User.Role.OPERATOR.equals(getCurrentRole());
    }
}
