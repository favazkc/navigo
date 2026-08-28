package com.navigo.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public class InviteRequest {

    @NotBlank(message = "Valid email required")
    @Email(message = "Valid email required")
    private String email;

    private String role = "Member"; // "Admin" | "Member"

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
}
