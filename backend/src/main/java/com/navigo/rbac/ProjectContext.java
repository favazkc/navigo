package com.navigo.rbac;

import com.navigo.model.Project;
import com.navigo.model.ProjectMember;
import org.springframework.stereotype.Component;
import org.springframework.web.context.annotation.RequestScope;

/**
 * Request-scoped holder for the resolved project and membership.
 * Populated by ProjectRoleInterceptor and consumed by controllers.
 * Mirrors Node's req.project and req.membership.
 */
@Component
@RequestScope
public class ProjectContext {

    private Project project;
    private ProjectMember membership;

    public Project getProject() { return project; }
    public void setProject(Project project) { this.project = project; }

    public ProjectMember getMembership() { return membership; }
    public void setMembership(ProjectMember membership) { this.membership = membership; }
}
