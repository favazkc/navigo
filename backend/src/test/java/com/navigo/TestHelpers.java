package com.navigo;

import com.navigo.model.User;
import com.navigo.security.JwtService;

/**
 * Test helper — mirrors Node's helpers/auth.js makeToken() and helpers/db.js.
 */
public class TestHelpers {

    /**
     * Issue a test JWT for the given user.
     */
    public static String makeToken(User user, JwtService jwtService) {
        return jwtService.issueToken(user);
    }

    /**
     * Create a transient User object for token generation (not persisted).
     */
    public static User buildUser(String id, String email, String systemRole) {
        User u = new User();
        u.setId(id);
        u.setEmail(email);
        u.setSystemRole(systemRole);
        u.setName("Test User");
        return u;
    }
}
