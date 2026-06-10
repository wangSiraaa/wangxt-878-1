package com.cargo.uld.controller;

import com.cargo.uld.common.BusinessException;
import com.cargo.uld.common.Result;
import com.cargo.uld.dto.LoginRequest;
import com.cargo.uld.dto.LoginResponse;
import com.cargo.uld.entity.User;
import com.cargo.uld.repository.UserRepository;
import com.cargo.uld.security.JwtTokenProvider;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider jwtTokenProvider;
    private final UserRepository userRepository;

    @PostMapping("/login")
    public Result<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getUsername(),
                        request.getPassword()
                )
        );

        User user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> BusinessException.of("用户不存在"));

        if (!user.getEnabled()) {
            throw BusinessException.of("该账号已被禁用");
        }

        String token = jwtTokenProvider.generateToken(
                user.getId(), user.getUsername(), user.getRole(), user.getRealName()
        );

        LoginResponse resp = new LoginResponse(
                token, user.getId(), user.getUsername(), user.getRealName(), user.getRole()
        );

        log.info("用户登录成功: {} (角色: {})", user.getUsername(), user.getRole());
        return Result.success(resp);
    }
}
