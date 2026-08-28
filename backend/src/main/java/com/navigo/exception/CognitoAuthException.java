package com.navigo.exception;

/**
 * Thrown when Cognito token verification fails.
 */
public class CognitoAuthException extends RuntimeException {

    public CognitoAuthException(String message) {
        super(message);
    }

    public CognitoAuthException(String message, Throwable cause) {
        super(message, cause);
    }
}
