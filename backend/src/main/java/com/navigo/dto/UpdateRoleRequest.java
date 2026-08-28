package com.navigo.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public class UpdateRoleRequest {

    @NotNull(message = "Role must be Admin or Member")
    @Pattern(regexp = "Admin|Member", message = "Role must be Admin or Member")
    private String role;

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
}
