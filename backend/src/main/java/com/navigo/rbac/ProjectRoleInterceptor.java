package com.navigo.rbac;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.navigo.model.Project;
import com.navigo.model.ProjectMember;
import com.navigo.repository.ProjectRepository;
import com.navigo.security.AuthUser;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.HandlerMapping;

import java.util.Map;

/**
 * Mirrors Node's requireRole middleware.
 * Resolves the project from the {id} path variable, checks membership,
 * and populates ProjectContext for downstream controller use.
 */
@Component
public class ProjectRoleInterceptor implements HandlerInterceptor {

    private static final String REQUIRE_ADMIN = "REQUIRE_ADMIN";

    private final ProjectRepository projectRepository;
    private final ProjectContext projectContext;
    private final ObjectMapper objectMapper;

    public ProjectRoleInterceptor(ProjectRepository projectRepository,
                                   ProjectContext projectContext,
                                   ObjectMapper objectMapper) {
        this.projectRepository = projectRepository;
        this.projectContext = projectContext;
        this.objectMapper = objectMapper;
    }

    @Override
    public boolean preHandle(HttpServletRequest request,
                              HttpServletResponse response,
                              Object handler) throws Exception {

        // Extract {id} from URI template variables
        @SuppressWarnings("unchecked")
        Map<String, String> pathVars = (Map<String, String>)
                request.getAttribute(HandlerMapping.URI_TEMPLATE_VARIABLES_ATTRIBUTE);

        String projectId = pathVars != null ? pathVars.get("id") : null;
        if (projectId == null) {
            return true; // No project ID — let pass (shouldn't happen for project routes)
        }

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof AuthUser authUser)) {
            writeError(response, 401, "No token provided");
            return false;
        }

        Project project = projectRepository.findById(projectId).orElse(null);
        if (project == null) {
            writeError(response, 404, "Project not found");
            return false;
        }

        ProjectMember membership = project.getMembers().stream()
                .filter(m -> authUser.getId().equals(m.getUser()))
                .findFirst()
                .orElse(null);

        if (membership == null) {
            writeError(response, 403, "Access denied: not a project member");
            return false;
        }

        // Check if the route requires Admin role
        boolean requireAdmin = Boolean.TRUE.equals(request.getAttribute(REQUIRE_ADMIN));
        if (requireAdmin && !"Admin".equals(membership.getRole())) {
            writeError(response, 403, "Access denied: Admin role required");
            return false;
        }

        projectContext.setProject(project);
        projectContext.setMembership(membership);
        return true;
    }

    private void writeError(HttpServletResponse response, int status, String message)
            throws Exception {
        response.setStatus(status);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        objectMapper.writeValue(response.getWriter(),
                Map.of("success", false, "message", message));
    }
}
