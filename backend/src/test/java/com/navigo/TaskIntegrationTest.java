package com.navigo;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.navigo.model.Project;
import com.navigo.model.ProjectMember;
import com.navigo.model.Task;
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

class TaskIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private ObjectMapper objectMapper;

    // ── Create task ────────────────────────────────────────────────────────────

    @Test
    void createTask_member_201() throws Exception {
        User admin = createUser("admin@task.com", "admin");
        Project project = createProject("TaskProj", admin);
        String token = TestHelpers.makeToken(admin, jwtService);

        mockMvc.perform(post("/api/v1/projects/" + project.getId() + "/tasks")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("title", "My Task"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.title").value("My Task"))
                .andExpect(jsonPath("$.data.status").value("Backlog"));
    }

    @Test
    void createTask_missingTitle_400() throws Exception {
        User admin = createUser("admin2@task.com", "admin");
        Project project = createProject("TaskProj2", admin);
        String token = TestHelpers.makeToken(admin, jwtService);

        mockMvc.perform(post("/api/v1/projects/" + project.getId() + "/tasks")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
                .andExpect(status().isBadRequest());
    }

    // ── List tasks ─────────────────────────────────────────────────────────────

    @Test
    void listTasks_200() throws Exception {
        User admin = createUser("admin3@task.com", "admin");
        Project project = createProject("ListProj", admin);
        createTask(project, admin, "Task One");
        String token = TestHelpers.makeToken(admin, jwtService);

        mockMvc.perform(get("/api/v1/projects/" + project.getId() + "/tasks")
                .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data[0].title").value("Task One"));
    }

    // ── Delete task ────────────────────────────────────────────────────────────

    @Test
    void deleteTask_admin_200() throws Exception {
        User admin = createUser("admin4@task.com", "admin");
        Project project = createProject("DelProj", admin);
        Task task = createTask(project, admin, "Del Task");
        String token = TestHelpers.makeToken(admin, jwtService);

        mockMvc.perform(delete("/api/v1/projects/" + project.getId() + "/tasks/" + task.getId())
                .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Task deleted"));
    }

    @Test
    void deleteTask_notFound_404() throws Exception {
        User admin = createUser("admin5@task.com", "admin");
        Project project = createProject("NotFoundProj", admin);
        String token = TestHelpers.makeToken(admin, jwtService);

        mockMvc.perform(delete("/api/v1/projects/" + project.getId() + "/tasks/000000000000000000000000")
                .header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound());
    }

    // ── Reorder tasks ──────────────────────────────────────────────────────────

    @Test
    void reorderTasks_emptyArray_400() throws Exception {
        User admin = createUser("admin6@task.com", "admin");
        Project project = createProject("ReorderProj", admin);
        String token = TestHelpers.makeToken(admin, jwtService);

        mockMvc.perform(patch("/api/v1/projects/" + project.getId() + "/tasks/reorder")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("updates", List.of()))))
                .andExpect(status().isBadRequest());
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

    private Task createTask(Project project, User creator, String title) {
        Task t = new Task();
        t.setProject(project.getId());
        t.setTitle(title);
        t.setStatus("Backlog");
        t.setPriority("Medium");
        t.setCreatedBy(creator.getId());
        return taskRepository.save(t);
    }
}
