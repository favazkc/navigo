package com.navigo;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.navigo.model.User;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class AuthIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private BCryptPasswordEncoder passwordEncoder;

    // ── Register ───────────────────────────────────────────────────────────────

    @Test
    void register_success_201() throws Exception {
        mockMvc.perform(post("/api/v1/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json("name", "Alice", "email", "alice@example.com", "password", "password123")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.token").isNotEmpty())
                .andExpect(jsonPath("$.data.user.email").value("alice@example.com"));
    }

    @Test
    void register_missingFields_400() throws Exception {
        mockMvc.perform(post("/api/v1/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void register_shortPassword_422() throws Exception {
        mockMvc.perform(post("/api/v1/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json("name", "Bob", "email", "bob@example.com", "password", "short")))
                .andExpect(status().isUnprocessableEntity());
    }

    @Test
    void register_duplicate_409() throws Exception {
        mockMvc.perform(post("/api/v1/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json("name", "Alice", "email", "alice@example.com", "password", "password123")))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/v1/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json("name", "Alice2", "email", "alice@example.com", "password", "password456")))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("Email already registered"));
    }

    @Test
    void register_stubCompletion_201() throws Exception {
        // Create a stub user (invited but not yet registered)
        User stub = new User();
        stub.setEmail("stub@example.com");
        stub.setName("");
        userRepository.save(stub);

        mockMvc.perform(post("/api/v1/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json("name", "Stub User", "email", "stub@example.com", "password", "password123")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.user.email").value("stub@example.com"));
    }

    // ── Login ──────────────────────────────────────────────────────────────────

    @Test
    void login_success_200() throws Exception {
        User user = new User();
        user.setEmail("login@example.com");
        user.setName("Login User");
        user.setPassword(passwordEncoder.encode("password123"));
        user.setSystemRole("user");
        userRepository.save(user);

        mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json("email", "login@example.com", "password", "password123")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.token").isNotEmpty());
    }

    @Test
    void login_wrongPassword_401() throws Exception {
        User user = new User();
        user.setEmail("user@example.com");
        user.setPassword(passwordEncoder.encode("correct"));
        user.setSystemRole("user");
        userRepository.save(user);

        mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json("email", "user@example.com", "password", "wrong")))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void login_unknownEmail_401() throws Exception {
        mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json("email", "nobody@example.com", "password", "password")))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void login_missingFields_422() throws Exception {
        mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
                .andExpect(status().isUnprocessableEntity());
    }

    // ── Logout ─────────────────────────────────────────────────────────────────

    @Test
    void logout_noToken_401() throws Exception {
        mockMvc.perform(post("/api/v1/auth/logout"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void logout_withToken_200() throws Exception {
        User user = new User();
        user.setEmail("logout@example.com");
        user.setPassword(passwordEncoder.encode("password123"));
        user.setSystemRole("user");
        userRepository.save(user);
        String token = TestHelpers.makeToken(user, jwtService);

        mockMvc.perform(post("/api/v1/auth/logout")
                .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    // ── Auth middleware checks ─────────────────────────────────────────────────

    @Test
    void protectedRoute_noHeader_401() throws Exception {
        mockMvc.perform(get("/api/v1/users/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void protectedRoute_malformedToken_401() throws Exception {
        mockMvc.perform(get("/api/v1/users/me")
                .header("Authorization", "Bearer not.a.token"))
                .andExpect(status().isUnauthorized());
    }

    // ── Health ─────────────────────────────────────────────────────────────────

    @Test
    void health_ok() throws Exception {
        mockMvc.perform(get("/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ok"));
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    private String json(String... keyValues) throws Exception {
        Map<String, String> map = new java.util.LinkedHashMap<>();
        for (int i = 0; i < keyValues.length; i += 2) {
            map.put(keyValues[i], keyValues[i + 1]);
        }
        return objectMapper.writeValueAsString(map);
    }
}
