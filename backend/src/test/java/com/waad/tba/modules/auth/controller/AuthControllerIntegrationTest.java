package com.waad.tba.modules.auth.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.waad.tba.common.dto.ApiResponse;
import com.waad.tba.modules.auth.dto.LoginRequest;
import com.waad.tba.modules.auth.dto.LoginResponse;
import com.waad.tba.modules.auth.dto.TokenRefreshRequest;
import com.waad.tba.modules.auth.entity.RefreshToken;
import com.waad.tba.modules.auth.service.AuthService;
import com.waad.tba.modules.auth.service.RefreshTokenService;
import com.waad.tba.modules.rbac.entity.User;
import com.waad.tba.security.JwtTokenProvider;
import com.waad.tba.security.UserPrincipal;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;

// @SpringBootTest // Disabled for now as we don't have a running DB environment
// @AutoConfigureMockMvc
public class AuthControllerIntegrationTest {

    // Placeholder for when we can run integration tests with H2 or Testcontainers
    // Currently we rely on unit tests and manual verification
    /*
    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private AuthService authService;

    @MockBean
    private RefreshTokenService refreshTokenService;

    @MockBean
    private JwtTokenProvider tokenProvider;

    @Test
    void login_ShouldReturnTokenAndRefreshToken() throws Exception {
        LoginRequest loginRequest = new LoginRequest();
        loginRequest.setIdentifier("testuser");
        loginRequest.setPassword("password");

        LoginResponse loginResponse = new LoginResponse();
        loginResponse.setToken("access-token");
        User user = new User();
        user.setId(1L);
        LoginResponse.UserInfo userInfo = new LoginResponse.UserInfo();
        userInfo.setId(1L);
        loginResponse.setUser(userInfo);

        RefreshToken refreshToken = new RefreshToken();
        refreshToken.setToken("refresh-token");

        when(authService.login(any(LoginRequest.class))).thenReturn(loginResponse);
        when(refreshTokenService.createRefreshToken(1L)).thenReturn(refreshToken);

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(new ObjectMapper().writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.token").value("access-token"))
                .andExpect(jsonPath("$.data.refreshToken").value("refresh-token"));
    }
    */
}
