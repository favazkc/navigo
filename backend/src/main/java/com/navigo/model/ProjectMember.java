package com.navigo.model;

/**
 * Embedded subdocument — no _id field (mirrors Mongoose { _id: false }).
 */
public class ProjectMember {

    private String user;  // stored as ObjectId string ref to users collection
    private String role = "Member"; // "Admin" | "Member"

    public ProjectMember() {}

    public ProjectMember(String user, String role) {
        this.user = user;
        this.role = role;
    }

    public String getUser() { return user; }
    public void setUser(String user) { this.user = user; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
}
