package com.navigo.dto;

/**
 * Auth response data: { token, user: { id, email, name, systemRole } }
 */
public class AuthResponse {

    private String token;
    private UserSummary user;

    public AuthResponse(String token, UserSummary user) {
        this.token = token;
        this.user = user;
    }

    public String getToken() { return token; }
    public UserSummary getUser() { return user; }

    public static class UserSummary {
        private String id;
        private String email;
        private String name;
        private String systemRole;

        public UserSummary(String id, String email, String name, String systemRole) {
            this.id = id;
            this.email = email;
            this.name = name;
            this.systemRole = systemRole;
        }

        public String getId() { return id; }
        public String getEmail() { return email; }
        public String getName() { return name; }
        public String getSystemRole() { return systemRole; }
    }
}
