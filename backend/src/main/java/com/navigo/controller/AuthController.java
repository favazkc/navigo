package com.navigo.controller;

import com.navigo.dto.ApiResponse;
import com.navigo.dto.AuthResponse;
import com.navigo.dto.LoginRequest;
import com.navigo.dto.RegisterRequest;
import com.navigo.exception.BadRequestException;
import com.navigo.service.AuthService;
import com.navigo.service.CognitoService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;
    private final CognitoService cognitoService;

    public AuthController(AuthService authService, CognitoService cognitoService) {
        this.authService = authService;
        this.cognitoService = cognitoService;
    }

    // ── POST /api/v1/auth/register ─────────────────────────────────────────────

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<AuthResponse> register(@Valid @RequestBody RegisterRequest req) {
        AuthResponse authResponse = authService.register(req.getName(), req.getEmail(), req.getPassword());
        return ApiResponse.ok(authResponse);
    }

    // ── POST /api/v1/auth/login ────────────────────────────────────────────────

    @PostMapping("/login")
    public ApiResponse<AuthResponse> login(@Valid @RequestBody LoginRequest req) {
        AuthResponse authResponse = authService.login(req.getEmail(), req.getPassword());
        return ApiResponse.ok(authResponse);
    }

    // ── GET /api/v1/auth/login — Cognito login URL ─────────────────────────────

    @GetMapping("/login")
    public ApiResponse<Object> cognitoLoginUrl() {
        String loginUrl = cognitoService.getLoginUrl();
        return ApiResponse.ok(java.util.Map.of("loginUrl", loginUrl));
    }

    // ── GET /api/v1/auth/callback — Cognito code exchange ─────────────────────

    @GetMapping("/callback")
    public ApiResponse<AuthResponse> callback(@RequestParam(required = false) String code) {
        if (code == null || code.isBlank()) {
            throw new BadRequestException("Authorization code missing");
        }
        AuthResponse authResponse = authService.handleCognitoCallback(code);
        return ApiResponse.ok(authResponse);
    }

    // ── POST /api/v1/auth/logout ───────────────────────────────────────────────

    @PostMapping("/logout")
    public ApiResponse<Void> logout() {
        return ApiResponse.okMessage("Logged out successfully");
    }
}
