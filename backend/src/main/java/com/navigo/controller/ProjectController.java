package com.navigo.controller;

import com.navigo.dto.ApiResponse;
import com.navigo.dto.CreateProjectRequest;
import com.navigo.dto.UpdateProjectRequest;
import com.navigo.exception.ForbiddenException;
import com.navigo.exception.ResourceNotFoundException;
import com.navigo.model.Project;
import com.navigo.model.ProjectMember;
import com.navigo.model.Task;
import com.navigo.model.User;
import com.navigo.rbac.ProjectContext;
import com.navigo.repository.ProjectRepository;
import com.navigo.repository.TaskRepository;
import com.navigo.repository.UserRepository;
import com.navigo.security.AuthUser;
import com.navigo.service.ProjectService;
import jakarta.validation.Valid;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.aggregation.*;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/v1/projects")
public class ProjectController {

    private final ProjectRepository projectRepository;
    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
    private final ProjectService projectService;
    private final ProjectContext projectContext;
    private final MongoTemplate mongoTemplate;

    public ProjectController(ProjectRepository projectRepository,
                              TaskRepository taskRepository,
                              UserRepository userRepository,
                              ProjectService projectService,
                              ProjectContext projectContext,
                              MongoTemplate mongoTemplate) {
        this.projectRepository = projectRepository;
        this.taskRepository = taskRepository;
        this.userRepository = userRepository;
        this.projectService = projectService;
        this.projectContext = projectContext;
        this.mongoTemplate = mongoTemplate;
    }

    // ── GET /api/v1/projects ───────────────────────────────────────────────────

    @GetMapping
    public ApiResponse<List<Map<String, Object>>> listProjects(@AuthenticationPrincipal AuthUser authUser) {
        List<Project> projects = projectRepository.findByMembersUser(authUser.getId());

        // Aggregate task counts across all projects in one query
        List<String> projectIds = projects.stream().map(Project::getId).toList();

        Map<String, long[]> countMap = new HashMap<>();
        if (!projectIds.isEmpty()) {
            // Use MongoTemplate aggregation
            MatchOperation match = Aggregation.match(Criteria.where("project").in(projectIds));
            GroupOperation group = Aggregation.group("project")
                    .count().as("total")
                    .sum(ConditionalOperators.when(Criteria.where("status").is("Done")).then(1).otherwise(0)).as("done");
            AggregationResults<Map> results = mongoTemplate.aggregate(
                    Aggregation.newAggregation(match, group), "tasks", Map.class);
            for (Map row : results.getMappedResults()) {
                String pid = row.get("_id").toString();
                long total = ((Number) row.get("total")).longValue();
                long done = ((Number) row.get("done")).longValue();
                countMap.put(pid, new long[]{total, done});
            }
        }

        List<Map<String, Object>> enriched = new ArrayList<>();
        for (Project p : projects) {
            long[] counts = countMap.getOrDefault(p.getId(), new long[]{0, 0});
            Map<String, Object> data = projectToMap(p);
            data.put("status", projectService.deriveProjectStatus(counts[0], counts[1]));
            // Populate owner
            if (p.getOwner() != null) {
                userRepository.findById(p.getOwner()).ifPresent(owner ->
                        data.put("owner", Map.of("_id", owner.getId(), "name", owner.getName(), "email", owner.getEmail())));
            }
            enriched.add(data);
        }
        return ApiResponse.ok(enriched);
    }

    // ── POST /api/v1/projects ──────────────────────────────────────────────────

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<Project> createProject(@AuthenticationPrincipal AuthUser authUser,
                                               @Valid @RequestBody CreateProjectRequest req) {
        if (!"admin".equals(authUser.getSystemRole())) {
            throw new ForbiddenException("Only administrators can create projects");
        }

        Project project = new Project();
        project.setName(req.getName().trim());
        project.setDescription(req.getDescription() != null ? req.getDescription().trim() : "");
        project.setOwner(authUser.getId());
        project.setMembers(new ArrayList<>(List.of(new ProjectMember(authUser.getId(), "Admin"))));
        project.setDueDate(req.getDueDate());
        projectRepository.save(project);

        return ApiResponse.ok(project);
    }

    // ── GET /api/v1/projects/:id ───────────────────────────────────────────────

    @GetMapping("/{id}")
    public ApiResponse<Map<String, Object>> getProject(@PathVariable String id) {
        Project project = projectContext.getProject();
        long total = projectService.countTasks(project.getId());
        long done = projectService.countDoneTasks(project.getId());

        Map<String, Object> data = projectToMap(project);
        data.put("status", projectService.deriveProjectStatus(total, done));

        // Populate owner and members.user
        if (project.getOwner() != null) {
            userRepository.findById(project.getOwner()).ifPresent(owner ->
                    data.put("owner", Map.of("_id", owner.getId(), "name", owner.getName(), "email", owner.getEmail())));
        }
        List<Map<String, Object>> populatedMembers = new ArrayList<>();
        for (ProjectMember m : project.getMembers()) {
            userRepository.findById(m.getUser()).ifPresent(u -> {
                Map<String, Object> memberMap = new LinkedHashMap<>();
                memberMap.put("user", Map.of("_id", u.getId(), "name", u.getName(), "email", u.getEmail()));
                memberMap.put("role", m.getRole());
                populatedMembers.add(memberMap);
            });
        }
        data.put("members", populatedMembers);
        return ApiResponse.ok(data);
    }

    // ── PUT /api/v1/projects/:id ───────────────────────────────────────────────

    @PutMapping("/{id}")
    public ApiResponse<Project> updateProject(@PathVariable String id,
                                               @RequestBody UpdateProjectRequest req) {
        // Admin-only enforced via interceptor attribute — set in WebMvcConfig for PUT/DELETE
        ProjectMember membership = projectContext.getMembership();
        if (!"Admin".equals(membership.getRole())) {
            throw new ForbiddenException("Access denied: Admin role required");
        }

        Project project = projectContext.getProject();
        if (req.getName() != null && !req.getName().isBlank()) {
            project.setName(req.getName().trim());
        }
        if (req.getDescription() != null) {
            project.setDescription(req.getDescription().trim());
        }
        if (req.isDueDatePresent()) {
            project.setDueDate(req.getDueDate());
        }
        projectRepository.save(project);
        return ApiResponse.ok(project);
    }

    // ── DELETE /api/v1/projects/:id ────────────────────────────────────────────

    @DeleteMapping("/{id}")
    public ApiResponse<Void> deleteProject(@PathVariable String id) {
        ProjectMember membership = projectContext.getMembership();
        if (!"Admin".equals(membership.getRole())) {
            throw new ForbiddenException("Access denied: Admin role required");
        }

        Project project = projectContext.getProject();
        taskRepository.deleteByProject(project.getId());
        projectRepository.delete(project);
        return ApiResponse.okMessage("Project deleted");
    }

    // ── Helper ─────────────────────────────────────────────────────────────────

    private Map<String, Object> projectToMap(Project p) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("_id", p.getId());
        map.put("name", p.getName());
        map.put("description", p.getDescription());
        map.put("owner", p.getOwner());
        map.put("members", p.getMembers());
        map.put("dueDate", p.getDueDate());
        map.put("createdAt", p.getCreatedAt());
        map.put("updatedAt", p.getUpdatedAt());
        return map;
    }
}
