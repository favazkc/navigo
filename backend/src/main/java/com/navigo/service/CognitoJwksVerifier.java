package com.navigo.service;

import com.navigo.exception.CognitoAuthException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.math.BigInteger;
import java.security.KeyFactory;
import java.security.interfaces.RSAPublicKey;
import java.security.spec.RSAPublicKeySpec;
import java.util.Base64;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicBoolean;

@Component
public class CognitoJwksVerifier {

    private final String userPoolId;
    private final String cognitoClientId;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    // Cache: kid → RSAPublicKey — loaded once on first use
    private final Map<String, RSAPublicKey> keyCache = new ConcurrentHashMap<>();
    private final AtomicBoolean keysLoaded = new AtomicBoolean(false);

    public CognitoJwksVerifier(
            @Value("${cognito.user-pool-id}") String userPoolId,
            @Value("${cognito.client-id}") String cognitoClientId,
            RestTemplate restTemplate,
            ObjectMapper objectMapper) {
        this.userPoolId = userPoolId;
        this.cognitoClientId = cognitoClientId;
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
    }

    /**
     * Verify a Cognito id_token via JWKS. Returns the token claims on success.
     * Throws CognitoAuthException on any failure.
     */
    public Claims verify(String idToken) {
        ensureKeysLoaded();

        // Extract kid from JWT header without verifying
        String[] parts = idToken.split("\\.");
        if (parts.length != 3) {
            throw new CognitoAuthException("Malformed JWT");
        }

        String headerJson;
        try {
            headerJson = new String(Base64.getUrlDecoder().decode(parts[0]));
        } catch (Exception e) {
            throw new CognitoAuthException("Failed to decode JWT header");
        }

        String kid;
        try {
            JsonNode header = objectMapper.readTree(headerJson);
            kid = header.path("kid").asText(null);
        } catch (Exception e) {
            throw new CognitoAuthException("Failed to parse JWT header");
        }

        if (kid == null || !keyCache.containsKey(kid)) {
            // Refresh keys once and retry
            loadKeys();
            if (kid == null || !keyCache.containsKey(kid)) {
                throw new CognitoAuthException("Unknown JWT kid: " + kid);
            }
        }

        RSAPublicKey publicKey = keyCache.get(kid);
        try {
            return Jwts.parser()
                    .verifyWith(publicKey)
                    .build()
                    .parseSignedClaims(idToken)
                    .getPayload();
        } catch (Exception e) {
            throw new CognitoAuthException("Cognito token verification failed: " + e.getMessage(), e);
        }
    }

    private void ensureKeysLoaded() {
        if (!keysLoaded.get()) {
            loadKeys();
        }
    }

    private synchronized void loadKeys() {
        // Correct JWKS URL: cognito-idp.<region>.amazonaws.com/<userPoolId>/.well-known/jwks.json
        String region = userPoolId.split("_")[0];
        String jwksUrl = "https://cognito-idp." + region + ".amazonaws.com/" + userPoolId + "/.well-known/jwks.json";
        try {
            String json = restTemplate.getForObject(jwksUrl, String.class);
            JsonNode root = objectMapper.readTree(json);
            JsonNode keys = root.path("keys");

            for (JsonNode key : keys) {
                String kid = key.path("kid").asText();
                String n = key.path("n").asText();
                String e = key.path("e").asText();

                BigInteger modulus = new BigInteger(1, Base64.getUrlDecoder().decode(n));
                BigInteger exponent = new BigInteger(1, Base64.getUrlDecoder().decode(e));
                RSAPublicKeySpec spec = new RSAPublicKeySpec(modulus, exponent);
                RSAPublicKey publicKey = (RSAPublicKey) KeyFactory.getInstance("RSA").generatePublic(spec);
                keyCache.put(kid, publicKey);
            }
            keysLoaded.set(true);
        } catch (Exception e) {
            throw new CognitoAuthException("Failed to load Cognito JWKS: " + e.getMessage(), e);
        }
    }
}
