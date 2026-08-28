package com.navigo.security;

/**
 * Immutable principal attached to the Spring Security context.
 * Mirrors Node's req.user = { id, email, systemRole }.
 */
public class AuthUser {

    private final String id;
    private final String email;
    private final String systemRole;

    public AuthUser(String id, String email, String systemRole) {
        this.id = id;
        this.email = email;
        this.systemRole = systemRole;
    }

    public String getId() { return id; }
    public String getEmail() { return email; }
    public String getSystemRole() { return systemRole; }

    @Override
    public String toString() {
        return "AuthUser{id='" + id + "', email='" + email + "', systemRole='" + systemRole + "'}";
    }
}
