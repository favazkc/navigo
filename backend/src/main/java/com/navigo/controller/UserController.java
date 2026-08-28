package com.navigo.controller;

import com.navigo.dto.ApiResponse;
import com.navigo.dto.UpdateProfileRequest;
import com.navigo.exception.ResourceNotFoundException;
import com.navigo.model.User;
import com.navigo.repository.UserRepository;
import com.navigo.security.AuthUser;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/users")
public class UserController {

    private final UserRepository userRepository;

    public UserController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    // ── GET /api/v1/users/me ───────────────────────────────────────────────────

    @GetMapping("/me")
    public ApiResponse<User> getMe(@AuthenticationPrincipal AuthUser authUser) {
        User user = userRepository.findById(authUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return ApiResponse.ok(user);
    }

    // ── PUT /api/v1/users/me ───────────────────────────────────────────────────

    @PutMapping("/me")
    public ApiResponse<User> updateMe(@AuthenticationPrincipal AuthUser authUser,
                                      @Valid @RequestBody UpdateProfileRequest req) {
        User user = userRepository.findById(authUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        user.setName(req.getName().trim());
        userRepository.save(user);
        return ApiResponse.ok(user);
    }
}
