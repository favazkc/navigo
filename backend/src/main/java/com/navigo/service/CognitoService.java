package com.navigo.service;

import com.navigo.exception.CognitoAuthException;
import io.jsonwebtoken.Claims;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@Service
public class CognitoService {

    @Value("${cognito.domain}")
    private String cognitoDomain;

    @Value("${cognito.client-id}")
    private String cognitoClientId;

    @Value("${app.url}")
    private String appUrl;

    private final RestTemplate restTemplate;
    private final CognitoJwksVerifier jwksVerifier;

    public CognitoService(RestTemplate restTemplate, CognitoJwksVerifier jwksVerifier) {
        this.restTemplate = restTemplate;
        this.jwksVerifier = jwksVerifier;
    }

    /**
     * Build the Cognito Hosted UI login redirect URL.
     * Mirrors getCognitoLoginUrl() in cognito.service.js
     */
    public String getLoginUrl() {
        String redirectUri = appUrl + "/auth/callback";
        return cognitoDomain + "/login" +
                "?response_type=code" +
                "&client_id=" + cognitoClientId +
                "&redirect_uri=" + encodeUri(redirectUri) +
                "&scope=openid%20email%20profile";
    }

    /**
     * Exchange authorization code for Cognito tokens, then verify via JWKS.
     * Returns the id_token claims.
     * Throws CognitoAuthException on failure.
     */
    public Claims exchangeCodeForTokens(String code) {
        String redirectUri = appUrl + "/auth/callback";
        String tokenUrl = cognitoDomain + "/oauth2/token";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("grant_type", "authorization_code");
        body.add("client_id", cognitoClientId);
        body.add("redirect_uri", redirectUri);
        body.add("code", code);

        HttpEntity<MultiValueMap<String, String>> entity = new HttpEntity<>(body, headers);
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> tokenResponse = restTemplate.postForObject(tokenUrl, entity, Map.class);
            if (tokenResponse == null || !tokenResponse.containsKey("id_token")) {
                throw new CognitoAuthException("No id_token in Cognito response");
            }
            String idToken = (String) tokenResponse.get("id_token");
            return jwksVerifier.verify(idToken);
        } catch (HttpClientErrorException e) {
            throw new CognitoAuthException("Cognito token exchange failed: " + e.getResponseBodyAsString(), e);
        }
    }

    private String encodeUri(String uri) {
        try {
            return java.net.URLEncoder.encode(uri, "UTF-8");
        } catch (Exception e) {
            return uri;
        }
    }
}
