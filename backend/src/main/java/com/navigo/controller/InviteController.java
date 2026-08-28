package com.navigo.controller;

import com.navigo.dto.ApiResponse;
import com.navigo.exception.BadRequestException;
import com.navigo.exception.ResourceNotFoundException;
import com.navigo.model.Invite;
import com.navigo.model.Project;
import com.navigo.model.User;
import com.navigo.repository.InviteRepository;
import com.navigo.repository.ProjectRepository;
import com.navigo.repository.UserRepository;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/invites")
public class InviteController {

    private final InviteRepository inviteRepository;
    private final UserRepository userRepository;
    private final ProjectRepository projectRepository;

    public InviteController(InviteRepository inviteRepository,
                             UserRepository userRepository,
                             ProjectRepository projectRepository) {
        this.inviteRepository = inviteRepository;
        this.userRepository = userRepository;
        this.projectRepository = projectRepository;
    }

    // ── GET /api/v1/invites/accept?token=XXX ──────────────────────────────────

    @GetMapping("/accept")
    public ApiResponse<Map<String, Object>> acceptInvite(
            @RequestParam(required = false) String token) {

        if (token == null || token.isBlank()) {
            throw new BadRequestException("Token is required");
        }

        Invite invite = inviteRepository.findByToken(token)
                .orElseThrow(() -> new ResourceNotFoundException("Invite not found"));

        // Already accepted — idempotent
        if ("Accepted".equals(invite.getStatus())) {
            Project project = projectRepository.findById(invite.getProject()).orElse(null);
            String projectName = project != null ? project.getName() : "";
            return ApiResponse.okMessageData("Invite already accepted",
                    Map.of("projectId", invite.getProject(), "projectName", projectName));
        }

        if (!"Pending".equals(invite.getStatus())) {
            throw new BadRequestException("Invite is " + invite.getStatus());
        }

        if (invite.getExpiresAt().isBefore(Instant.now())) {
            invite.setStatus("Expired");
            inviteRepository.save(invite);
            throw new BadRequestException("Invite has expired");
        }

        // Upsert invited user
        String invitedEmail = invite.getInvitedEmail();
        User user = userRepository.findByEmail(invitedEmail).orElse(null);
        if (user == null) {
            user = new User();
            user.setEmail(invitedEmail);
            user.setName("");
            userRepository.save(user);
        }

        // Add to project members if not already present
        Project project = projectRepository.findById(invite.getProject())
                .orElseThrow(() -> new ResourceNotFoundException("Project not found"));

        String userId = user.getId();
        boolean alreadyMember = project.getMembers().stream()
                .anyMatch(m -> userId.equals(m.getUser()));
        if (!alreadyMember) {
            project.getMembers().add(new com.navigo.model.ProjectMember(userId, invite.getRole()));
            projectRepository.save(project);
        }

        invite.setStatus("Accepted");
        inviteRepository.save(invite);

        boolean isNewUser = user.getPassword() == null && user.getCognitoSub() == null;

        return ApiResponse.okMessageData("Invite accepted", Map.of(
                "projectId", project.getId(),
                "projectName", project.getName(),
                "isNewUser", isNewUser,
                "email", user.getEmail()
        ));
    }
}
