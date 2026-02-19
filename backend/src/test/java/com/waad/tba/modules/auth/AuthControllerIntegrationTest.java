package com.waad.tba.modules.auth;

import com.waad.tba.BaseIntegrationTest;
import com.waad.tba.modules.auth.dto.LoginRequest;
import com.waad.tba.modules.rbac.entity.User;
import com.waad.tba.modules.rbac.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

class AuthControllerIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @BeforeEach
    void setUp() {
        userRepository.deleteAll();
        
        User user = new User();
        user.setUsername("testuser");
        user.setEmail("test@waad.com");
        user.setPassword(passwordEncoder.encode("password123"));
        user.setFullName("Test User");
        user.setActive(true);
        userRepository.save(user);
    }

    @Test
    void login_WithValidCredentials_ShouldReturnToken() {
        LoginRequest loginRequest = new LoginRequest();
        loginRequest.setIdentifier("testuser");
        loginRequest.setPassword("password123");

        ResponseEntity<Object> response = restTemplate.postForEntity("/api/auth/login", loginRequest, Object.class);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
    }

    @Test
    void login_WithInvalidCredentials_ShouldReturnUnauthorized() {
        LoginRequest loginRequest = new LoginRequest();
        loginRequest.setIdentifier("testuser");
        loginRequest.setPassword("wrongpassword");

        ResponseEntity<Object> response = restTemplate.postForEntity("/api/auth/login", loginRequest, Object.class);

        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
    }
}
