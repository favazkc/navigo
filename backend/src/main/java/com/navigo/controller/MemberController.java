package com.navigo.controller;

import com.navigo.dto.ApiResponse;
import com.navigo.dto.InviteRequest;
import com.navigo.dto.UpdateRoleRequest;
import com.navigo.exception.BadRequestException;
import com.navigo.exception.ForbiddenException;
import com.navigo.exception.ResourceNotFoundException;
import com.navigo.model.Invite;
import com.navigo.model.Project;
import com.navigo.model.ProjectMember;
import com.navigo.model.User;
import com.navigo.rbac.ProjectContext;
import com.navigo.repository.InviteRepository;
import com.navigo.repository.TaskRepository;
import com.navigo.repository.UserRepository;
import com.navigo.service.EmailService;
import jakarta.validation.Valid;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import com.navigo.security.AuthUser;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.*;

@RestController
@RequestMapping("/api/v1/projects/{id}/members")
public class MemberController {

    private final ProjectContext projectContext;
    private final UserRepository userRepository;
    private final InviteRepository inviteRepository;
    private final TaskRepository taskRepository;
    private final EmailService emailService;
    private final MongoTemplate mongoTemplate;

    public MemberController(ProjectContext projectContext,
                             UserRepository userRepository,
                             InviteRepository inviteRepository,
                             TaskRepository taskRepository,
                             EmailService emailService,
                             MongoTemplate mongoTemplate) {
        this.projectContext = projectContext;
        this.userRepository = userRepository;
        this.inviteRepository = inviteRepository;
        this.taskRepository = taskRepository;
        this.emailService = emailService;
        this.mongoTemplate = mongoTemplate;
    }

    // ── GET /api/v1/projects/:id/members ──────────────────────────────────────

    @GetMapping
    public ApiResponse<List<Map<String, Object>>> listMembers(@PathVariable String id) {
        Project project = projectContext.getProject();
        List<Map<String, Object>> result = new ArrayList<>();
        for (ProjectMember m : project.getMembers()) {
            userRepository.findById(m.getUser()).ifPresent(u -> {
                Map<String, Object> entry = new LinkedHashMap<>();
                entry.put("user", Map.of("_id", u.getId(), "name", u.getName(), "email", u.getEmail()));
                entry.put("role", m.getRole());
                result.add(entry);
            });
        }
        return ApiResponse.ok(result);
    }

    // ── POST /api/v1/projects/:id/members/invite ───────────────────────────────

    @PostMapping("/invite")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<Void> inviteMember(@PathVariable String id,
                                           @AuthenticationPrincipal AuthUser authUser,
                                           @Valid @RequestBody InviteRequest req) {
        // Admin-only
        if (!"Admin".equals(projectContext.getMembership().getRole())) {
            throw new ForbiddenException("Access denied: Admin role required");
        }

        Project project = projectContext.getProject();
        String email = req.getEmail().toLowerCase().trim();
        String role = req.getRole() != null ? req.getRole() : "Member";

        // Validate role
        if (!role.equals("Admin") && !role.equals("Member")) {
            throw new BadRequestException("Role must be Admin or Member");
        }

        // Check already a member
        boolean alreadyMember = project.getMembers().stream()
                .anyMatch(m -> {
                    User u = userRepository.findById(m.getUser()).orElse(null);
                    return u != null && email.equals(u.getEmail());
                });
        if (alreadyMember) {
            throw new BadRequestException("User is already a project member");
        }

        // Cancel existing pending invites
        inviteRepository.deleteByProjectAndInvitedEmailAndStatus(project.getId(), email, "Pending");

        String token = UUID.randomUUID().toString();
        Instant expiresAt = Instant.now().plusSeconds(72L * 3600);

        Invite invite = new Invite();
        invite.setProject(project.getId());
        invite.setInvitedEmail(email);
        invite.setInvitedBy(authUser.getId());
        invite.setRole(role);
        invite.setToken(token);
        invite.setExpiresAt(expiresAt);
        inviteRepository.save(invite);

        User inviter = userRepository.findById(authUser.getId()).orElse(null);
        String inviterName = inviter != null
                ? (inviter.getName() != null && !inviter.getName().isBlank() ? inviter.getName() : inviter.getEmail())
                : authUser.getEmail();

        String emailWarning = null;
        try {
            emailService.sendInviteEmail(email, project.getName(), inviterName, token);
        } catch (Exception e) {
            emailWarning = "Invite created but email delivery failed. Please share the invite link manually.";
        }

        if (emailWarning != null) {
            return ApiResponse.okWarning(emailWarning, emailWarning, null);
        }
        return ApiResponse.<Void>okMessage("Invite sent to " + email);
    }

    // ── PUT /api/v1/projects/:id/members/:userId/role ──────────────────────────

    @PutMapping("/{userId}/role")
    public ApiResponse<List<ProjectMember>> updateMemberRole(@PathVariable String id,
                                                              @PathVariable String userId,
                                                              @Valid @RequestBody UpdateRoleRequest req) {
        if (!"Admin".equals(projectContext.getMembership().getRole())) {
            throw new ForbiddenException("Access denied: Admin role required");
        }

        Project project = projectContext.getProject();
        ProjectMember member = project.getMembers().stream()
                .filter(m -> userId.equals(m.getUser()))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Member not found"));

        member.setRole(req.getRole());
        mongoTemplate.save(project);
        return ApiResponse.ok(project.getMembers());
    }

    // ── DELETE /api/v1/projects/:id/members/:userId ────────────────────────────

    @DeleteMapping("/{userId}")
    public ApiResponse<Void> removeMember(@PathVariable String id,
                                           @PathVariable String userId) {
        if (!"Admin".equals(projectContext.getMembership().getRole())) {
            throw new ForbiddenException("Access denied: Admin role required");
        }

        Project project = projectContext.getProject();

        if (project.getOwner().equals(userId)) {
            throw new BadRequestException("Cannot remove the project owner");
        }

        project.setMembers(project.getMembers().stream()
                .filter(m -> !userId.equals(m.getUser()))
                .collect(java.util.stream.Collectors.toList()));

        mongoTemplate.save(project);

        // Unassign from non-Done tasks
        Query q = new Query(Criteria.where("project").is(project.getId())
                .and("assignee").is(userId)
                .and("status").ne("Done"));
        mongoTemplate.updateMulti(q, new Update().set("assignee", null), "tasks");

        return ApiResponse.okMessage("Member removed");
    }
}
