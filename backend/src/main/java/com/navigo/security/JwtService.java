package com.navigo.security;

import com.navigo.model.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class JwtService {

    private final RSAPrivateKey privateKey;
    private final RSAPublicKey publicKey;
    private final String expiresIn;

    public JwtService(RSAPrivateKey rsaPrivateKey,
                      RSAPublicKey rsaPublicKey,
                      @Value("${jwt.expires-in:7d}") String expiresIn) {
        this.privateKey = rsaPrivateKey;
        this.publicKey = rsaPublicKey;
        this.expiresIn = expiresIn;
    }

    /**
     * Issue an RS256-signed Navigo JWT.
     * Payload: { sub: user.id, email, systemRole }
     */
    public String issueToken(User user) {
        Instant now = Instant.now();
        Instant expiry = now.plus(parseDuration(expiresIn), ChronoUnit.SECONDS);

        return Jwts.builder()
                .subject(user.getId())
                .claim("email", user.getEmail())
                .claim("systemRole", user.getSystemRole())
                .issuedAt(Date.from(now))
                .expiration(Date.from(expiry))
                .signWith(privateKey, Jwts.SIG.RS256)
                .compact();
    }

    /**
     * Verify token with public key and return claims.
     * Throws JwtException on failure.
     */
    public Claims validateToken(String token) {
        return Jwts.parser()
                .verifyWith(publicKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    /**
     * Parse Node-style duration strings: "7d", "24h", "1h", "30m", "60s".
     * Returns duration in seconds.
     */
    private long parseDuration(String duration) {
        Pattern pattern = Pattern.compile("^(\\d+)([smhd])$");
        Matcher matcher = pattern.matcher(duration.trim());
        if (!matcher.matches()) {
            // fallback: 7 days
            return 7L * 24 * 3600;
        }
        long value = Long.parseLong(matcher.group(1));
        return switch (matcher.group(2)) {
            case "s" -> value;
            case "m" -> value * 60;
            case "h" -> value * 3600;
            case "d" -> value * 86400;
            default  -> 7L * 86400;
        };
    }
}
