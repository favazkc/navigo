package com.navigo;

import com.navigo.config.RsaKeyConfig;
import com.navigo.security.JwtService;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;

import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;

/**
 * Generates a fresh RSA key pair for each test run.
 * Overrides the prod RsaKeyConfig beans so no PEM files are needed.
 */
@TestConfiguration
public class TestRsaKeyConfig {

    private static final KeyPair KEY_PAIR;

    static {
        try {
            KeyPairGenerator gen = KeyPairGenerator.getInstance("RSA");
            gen.initialize(2048);
            KEY_PAIR = gen.generateKeyPair();
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate test RSA key pair", e);
        }
    }

    @Bean
    @Primary
    public RSAPrivateKey rsaPrivateKey() {
        return (RSAPrivateKey) KEY_PAIR.getPrivate();
    }

    @Bean
    @Primary
    public RSAPublicKey rsaPublicKey() {
        return (RSAPublicKey) KEY_PAIR.getPublic();
    }
}
