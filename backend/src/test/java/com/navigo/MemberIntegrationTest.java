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

class MemberIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private ObjectMapper objectMapper;

    // ── List members ───────────────────────────────────────────────────────────

    @Test
    void listMembers_200() throws Exception {
        User admin = createUser("admin@member.com", "admin");
        Project project = createProject("MemberProj", admin);
        String token = TestHelpers.makeToken(admin, jwtService);

        mockMvc.perform(get("/api/v1/projects/" + project.getId() + "/members")
                .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data[0].role").value("Admin"));
    }

    // ── Invite ─────────────────────────────────────────────────────────────────

    @Test
    void invite_admin_201() throws Exception {
        User admin = createUser("admin2@member.com", "admin");
        Project project = createProject("InviteProj", admin);
        String token = TestHelpers.makeToken(admin, jwtService);

        mockMvc.perform(post("/api/v1/projects/" + project.getId() + "/members/invite")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("email", "invited@example.com", "role", "Member"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    void invite_alreadyMember_400() throws Exception {
        User admin = createUser("admin3@member.com", "admin");
        User member = createUser("member@example.com", "user");
        Project project = createProject("MemberProjX", admin);
        // Add member to project
        project.getMembers().add(new ProjectMember(member.getId(), "Member"));
        projectRepository.save(project);
        String token = TestHelpers.makeToken(admin, jwtService);

        mockMvc.perform(post("/api/v1/projects/" + project.getId() + "/members/invite")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("email", "member@example.com", "role", "Member"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("User is already a project member"));
    }

    // ── Remove member ──────────────────────────────────────────────────────────

    @Test
    void removeMember_nonOwner_200() throws Exception {
        User admin = createUser("admin4@member.com", "admin");
        User member = createUser("removeme@example.com", "user");
        Project project = createProject("RemoveProj", admin);
        project.getMembers().add(new ProjectMember(member.getId(), "Member"));
        projectRepository.save(project);
        String token = TestHelpers.makeToken(admin, jwtService);

        mockMvc.perform(delete("/api/v1/projects/" + project.getId() + "/members/" + member.getId())
                .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Member removed"));
    }

    @Test
    void removeMember_owner_400() throws Exception {
        User admin = createUser("admin5@member.com", "admin");
        Project project = createProject("OwnerProj", admin);
        String token = TestHelpers.makeToken(admin, jwtService);

        mockMvc.perform(delete("/api/v1/projects/" + project.getId() + "/members/" + admin.getId())
                .header("Authorization", "Bearer " + token))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Cannot remove the project owner"));
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    private User createUser(String email, String role) {
        User u = new User();
        u.setEmail(email);
        u.setName("Test");
        u.setPassword(new BCryptPasswordEncoder(12).encode("pass1234"));
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
