package com.navigo.service;

import com.navigo.dto.AuthResponse;
import com.navigo.dto.AuthResponse.UserSummary;
import com.navigo.exception.AuthException;
import com.navigo.exception.ConflictException;
import com.navigo.model.User;
import com.navigo.repository.UserRepository;
import com.navigo.security.JwtService;
import io.jsonwebtoken.Claims;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final BCryptPasswordEncoder passwordEncoder;
    private final CognitoService cognitoService;

    public AuthService(UserRepository userRepository,
                       JwtService jwtService,
                       BCryptPasswordEncoder passwordEncoder,
                       CognitoService cognitoService) {
        this.userRepository = userRepository;
        this.jwtService = jwtService;
        this.passwordEncoder = passwordEncoder;
        this.cognitoService = cognitoService;
    }

    // ── Register ───────────────────────────────────────────────────────────────

    public AuthResponse register(String name, String email, String password) {
        String normalizedEmail = email.toLowerCase().trim();
        Optional<User> existingOpt = userRepository.findByEmail(normalizedEmail);

        if (existingOpt.isPresent()) {
            User existing = existingOpt.get();
            // Stub account from invite: password=null and no cognitoSub
            if (existing.getPassword() != null || existing.getCognitoSub() != null) {
                throw new ConflictException("Email already registered");
            }
            // Complete stub profile
            existing.setName(name.trim());
            existing.setPassword(passwordEncoder.encode(password));
            userRepository.save(existing);
            String token = jwtService.issueToken(existing);
            return toAuthResponse(token, existing);
        }

        User user = new User();
        user.setName(name.trim());
        user.setEmail(normalizedEmail);
        user.setPassword(passwordEncoder.encode(password));
        user.setSystemRole("user");
        userRepository.save(user);

        String token = jwtService.issueToken(user);
        return toAuthResponse(token, user);
    }

    // ── Login ──────────────────────────────────────────────────────────────────

    public AuthResponse login(String email, String password) {
        String normalizedEmail = email.toLowerCase().trim();
        User user = userRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new AuthException("Invalid email or password"));

        if (user.getPassword() == null || !passwordEncoder.matches(password, user.getPassword())) {
            throw new AuthException("Invalid email or password");
        }

        String token = jwtService.issueToken(user);
        return toAuthResponse(token, user);
    }

    // ── Cognito Callback Upsert ────────────────────────────────────────────────

    public AuthResponse handleCognitoCallback(String code) {
        Claims claims = cognitoService.exchangeCodeForTokens(code);

        String cognitoSub = claims.getSubject();
        String cognitoEmail = claims.get("email", String.class);
        String cognitoName = claims.getOrDefault("name", "").toString();

        User user = userRepository.findByCognitoSub(cognitoSub).orElse(null);
        if (user == null) {
            user = userRepository.findByEmail(cognitoEmail.toLowerCase().trim()).orElse(null);
            if (user != null) {
                user.setCognitoSub(cognitoSub);
                if (user.getName() == null || user.getName().isBlank()) {
                    user.setName(cognitoName);
                }
            } else {
                user = new User();
                user.setCognitoSub(cognitoSub);
                user.setEmail(cognitoEmail.toLowerCase().trim());
                user.setName(cognitoName);
            }
            userRepository.save(user);
        }

        String token = jwtService.issueToken(user);
        return toAuthResponse(token, user);
    }

    // ── Helper ─────────────────────────────────────────────────────────────────

    private AuthResponse toAuthResponse(String token, User user) {
        return new AuthResponse(token,
                new UserSummary(user.getId(), user.getEmail(), user.getName(),
                        user.getSystemRole() != null ? user.getSystemRole() : "user"));
    }
}
