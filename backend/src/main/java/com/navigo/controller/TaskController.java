package com.navigo.controller;

import com.navigo.dto.ApiResponse;
import com.navigo.dto.CreateTaskRequest;
import com.navigo.dto.ReorderRequest;
import com.navigo.dto.UpdateTaskRequest;
import com.navigo.exception.BadRequestException;
import com.navigo.exception.ForbiddenException;
import com.navigo.exception.ResourceNotFoundException;
import com.navigo.model.Task;
import com.navigo.rbac.ProjectContext;
import com.navigo.repository.TaskRepository;
import com.navigo.security.AuthUser;
import com.navigo.service.TaskService;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/v1/projects/{id}/tasks")
public class TaskController {

    private static final Set<String> VALID_STATUSES = Set.of(
            "Backlog", "To Do", "In Progress", "Blocked", "Done");
    private static final Set<String> VALID_PRIORITIES = Set.of("Low", "Medium", "High");

    private final TaskRepository taskRepository;
    private final TaskService taskService;
    private final ProjectContext projectContext;

    public TaskController(TaskRepository taskRepository,
                          TaskService taskService,
                          ProjectContext projectContext) {
        this.taskRepository = taskRepository;
        this.taskService = taskService;
        this.projectContext = projectContext;
    }

    // ── GET /api/v1/projects/:id/tasks ─────────────────────────────────────────

    @GetMapping
    public ApiResponse<List<Map<String, Object>>> listTasks(@PathVariable String id) {
        List<Task> tasks = taskRepository.findByProjectOrderByStatusAscOrderAsc(id);
        return ApiResponse.ok(taskService.populateTasks(tasks));
    }

    // ── POST /api/v1/projects/:id/tasks ────────────────────────────────────────

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<Map<String, Object>> createTask(@PathVariable String id,
                                                        @AuthenticationPrincipal AuthUser authUser,
                                                        @RequestBody CreateTaskRequest req) {
        if (req.getTitle() == null || req.getTitle().isBlank()) {
            throw new BadRequestException("Task title is required");
        }

        String status = req.getStatus() != null ? req.getStatus() : "Backlog";
        if (!VALID_STATUSES.contains(status)) {
            throw new BadRequestException("Invalid status");
        }
        String priority = req.getPriority() != null ? req.getPriority() : "Medium";
        if (!VALID_PRIORITIES.contains(priority)) {
            throw new BadRequestException("Invalid priority");
        }

        // Calculate next order within the status column
        int nextOrder = taskRepository.findTopByProjectAndStatusOrderByOrderDesc(id, status)
                .map(t -> t.getOrder() + 1)
                .orElse(0);

        Task task = new Task();
        task.setProject(id);
        task.setTitle(req.getTitle().trim());
        task.setDescription(req.getDescription() != null ? req.getDescription() : "");
        task.setStatus(status);
        task.setPriority(priority);
        task.setDueDate(req.getDueDate());
        task.setAssignee(req.getAssignee());
        task.setCreatedBy(authUser.getId());
        task.setOrder(nextOrder);
        taskRepository.save(task);

        return ApiResponse.ok(taskService.populateTask(task));
    }

    // ── GET /api/v1/projects/:id/tasks/:taskId ─────────────────────────────────

    @GetMapping("/{taskId}")
    public ApiResponse<Map<String, Object>> getTask(@PathVariable String id,
                                                     @PathVariable String taskId) {
        Task task = taskRepository.findByIdAndProject(taskId, id)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found"));
        return ApiResponse.ok(taskService.populateTask(task));
    }

    // ── PUT /api/v1/projects/:id/tasks/:taskId ─────────────────────────────────

    @PutMapping("/{taskId}")
    public ApiResponse<Map<String, Object>> updateTask(@PathVariable String id,
                                                        @PathVariable String taskId,
                                                        @AuthenticationPrincipal AuthUser authUser,
                                                        @RequestBody UpdateTaskRequest req) {
        Task task = taskRepository.findByIdAndProject(taskId, id)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found"));

        boolean isAdmin = "Admin".equals(projectContext.getMembership().getRole());
        boolean isCreator = authUser.getId().equals(task.getCreatedBy());
        String currentAssignee = task.getAssignee();
        boolean isAssignedToMe = authUser.getId().equals(currentAssignee);
        boolean isUnassigned = currentAssignee == null;

        if (!isAdmin) {
            boolean canEdit = isCreator || isAssignedToMe || isUnassigned;
            if (!canEdit) {
                throw new ForbiddenException("Access denied: you can only edit tasks you created or are assigned to");
            }
            // Non-admin non-creator cannot assign to others
            if (!isCreator && req.has("assignee")) {
                String newAssignee = req.getAssignee();
                if (newAssignee != null && !newAssignee.equals(authUser.getId())) {
                    throw new ForbiddenException("Access denied: you cannot assign tasks to other members");
                }
            }
        }

        // Apply updates based on permission level
        boolean fullAccess = isAdmin || isCreator;
        if (fullAccess) {
            if (req.has("title") && req.getTitle() != null && !req.getTitle().isBlank()) {
                task.setTitle(req.getTitle().trim());
            }
            if (req.has("description")) task.setDescription(req.getDescription() != null ? req.getDescription() : "");
            if (req.has("status") && req.getStatus() != null) task.setStatus(req.getStatus());
            if (req.has("priority") && req.getPriority() != null) task.setPriority(req.getPriority());
            if (req.has("dueDate")) task.setDueDate(req.getDueDate());
            if (req.has("order") && req.getOrder() != null) task.setOrder(req.getOrder());
        } else {
            // Assignee / unassigned non-creator: limited fields
            if (req.has("status") && req.getStatus() != null) task.setStatus(req.getStatus());
            if (req.has("description")) task.setDescription(req.getDescription() != null ? req.getDescription() : "");
        }

        // Assignee update for all who are allowed
        if (req.has("assignee")) {
            task.setAssignee(req.getAssignee());
        }

        taskRepository.save(task);
        return ApiResponse.ok(taskService.populateTask(task));
    }

    // ── DELETE /api/v1/projects/:id/tasks/:taskId ──────────────────────────────

    @DeleteMapping("/{taskId}")
    public ApiResponse<Void> deleteTask(@PathVariable String id,
                                         @PathVariable String taskId) {
        // Admin-only check via membership in projectContext
        if (!"Admin".equals(projectContext.getMembership().getRole())) {
            throw new ForbiddenException("Access denied: Admin role required");
        }
        Task task = taskRepository.findByIdAndProject(taskId, id)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found"));
        taskRepository.delete(task);
        return ApiResponse.okMessage("Task deleted");
    }

    // ── PATCH /api/v1/projects/:id/tasks/reorder ───────────────────────────────

    @PatchMapping("/reorder")
    public ApiResponse<Void> reorderTasks(@PathVariable String id,
                                           @AuthenticationPrincipal AuthUser authUser,
                                           @RequestBody ReorderRequest req) {
        if (req.getUpdates() == null || req.getUpdates().isEmpty()) {
            throw new BadRequestException("updates array required");
        }

        boolean isAdmin = "Admin".equals(projectContext.getMembership().getRole());

        if (!isAdmin) {
            // Only dragged tasks (with status change) need ownership check
            List<String> draggedIds = req.getUpdates().stream()
                    .filter(u -> u.getStatus() != null)
                    .map(ReorderRequest.TaskUpdate::getId)
                    .toList();

            if (!draggedIds.isEmpty()) {
                List<Task> draggedTasks = taskRepository.findByIdInAndProject(draggedIds, id);
                boolean forbidden = draggedTasks.stream().anyMatch(t -> {
                    boolean isCreator = authUser.getId().equals(t.getCreatedBy());
                    String assignee = t.getAssignee();
                    return !isCreator && !authUser.getId().equals(assignee) && assignee != null;
                });
                if (forbidden) {
                    throw new ForbiddenException("Access denied: you can only move tasks you created or are assigned to");
                }
            }
        }

        taskService.bulkUpdateOrders(id, req.getUpdates());
        return ApiResponse.okMessage("Tasks reordered");
    }
}
