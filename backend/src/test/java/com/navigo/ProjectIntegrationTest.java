package com.navigo;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.navigo.model.Project;
import com.navigo.model.ProjectMember;
import com.navigo.model.User;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class ProjectIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private BCryptPasswordEncoder passwordEncoder;

    // ── Create project ─────────────────────────────────────────────────────────

    @Test
    void createProject_adminUser_201() throws Exception {
        User admin = createUser("admin@example.com", "admin");
        String token = TestHelpers.makeToken(admin, jwtService);

        mockMvc.perform(post("/api/v1/projects")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("name", "Test Project"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.name").value("Test Project"));
    }

    @Test
    void createProject_nonAdmin_403() throws Exception {
        User user = createUser("user@example.com", "user");
        String token = TestHelpers.makeToken(user, jwtService);

        mockMvc.perform(post("/api/v1/projects")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("name", "Project"))))
                .andExpect(status().isForbidden());
    }

    @Test
    void createProject_missingName_422() throws Exception {
        User admin = createUser("admin2@example.com", "admin");
        String token = TestHelpers.makeToken(admin, jwtService);

        mockMvc.perform(post("/api/v1/projects")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
                .andExpect(status().isUnprocessableEntity());
    }

    // ── List projects ──────────────────────────────────────────────────────────

    @Test
    void listProjects_onlyMemberProjects_200() throws Exception {
        User admin = createUser("admin3@example.com", "admin");
        String token = TestHelpers.makeToken(admin, jwtService);

        // Create project as admin
        mockMvc.perform(post("/api/v1/projects")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("name", "My Project"))))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/api/v1/projects")
                .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data[0].name").value("My Project"));
    }

    // ── Get project ────────────────────────────────────────────────────────────

    @Test
    void getProject_nonMember_403() throws Exception {
        User admin = createUser("admin4@example.com", "admin");
        Project project = createProject("Secret", admin);

        User other = createUser("other@example.com", "user");
        String token = TestHelpers.makeToken(other, jwtService);

        mockMvc.perform(get("/api/v1/projects/" + project.getId())
                .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    @Test
    void getProject_notFound_404() throws Exception {
        User admin = createUser("admin5@example.com", "admin");
        String token = TestHelpers.makeToken(admin, jwtService);

        mockMvc.perform(get("/api/v1/projects/000000000000000000000000")
                .header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound());
    }

    // ── Delete project ─────────────────────────────────────────────────────────

    @Test
    void deleteProject_admin_200() throws Exception {
        User admin = createUser("admin6@example.com", "admin");
        Project project = createProject("To Delete", admin);
        String token = TestHelpers.makeToken(admin, jwtService);

        mockMvc.perform(delete("/api/v1/projects/" + project.getId())
                .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Project deleted"));
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    private User createUser(String email, String role) {
        User u = new User();
        u.setEmail(email);
        u.setName("Test");
        u.setPassword(new BCryptPasswordEncoder(12).encode("password123"));
        u.setSystemRole(role);
        return userRepository.save(u);
    }

    private Project createProject(String name, User owner) {
        Project p = new Project();
        p.setName(name);
        p.setOwner(owner.getId());
        p.setMembers(new ArrayList<>(List.of(new ProjectMember(owner.getId(), "Admin"))));
        return projectRepository.save(p);
    }
}
