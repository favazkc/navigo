package com.navigo.config;

import com.navigo.rbac.ProjectRoleInterceptor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    private final ProjectRoleInterceptor projectRoleInterceptor;

    public WebMvcConfig(ProjectRoleInterceptor projectRoleInterceptor) {
        this.projectRoleInterceptor = projectRoleInterceptor;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        // Apply RBAC interceptor to all project sub-routes
        registry.addInterceptor(projectRoleInterceptor)
                .addPathPatterns("/api/v1/projects/{id}/**");
    }
}
