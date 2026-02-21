package com.waad.tba.modules.auth;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * ══════════════════════════════════════════════════════════════════
 * AUTH SECURITY TEST SUITE
 * ══════════════════════════════════════════════════════════════════
 * Tests: RBAC enforcement, JWT protection, session isolation
 * Uses @WithMockUser to simulate roles without real JWT tokens
 * ══════════════════════════════════════════════════════════════════
 */
@SpringBootTest
@AutoConfigureMockMvc
@DisplayName("Auth Security Tests")
class AuthSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    // ═══════════════════════════════════════════════════════════════
    // نقاط النهاية العامة (Public Endpoints) — لا تحتاج token
    // ═══════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("Public endpoints — no authentication required")
    class PublicEndpointTests {

        @Test
        @DisplayName("TC-SEC-01: POST /login متاح بدون token → لا يُرجع 401 بسبب السياسة الأمنية")
        void loginEndpoint_isPubliclyAccessible() throws Exception {
            // سيُرجع 400 (bad request body) أو 401 (bad creds) — ليس 403
            mockMvc.perform(post("/api/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"identifier\":\"x\",\"password\":\"y\"}"))
                    .andExpect(result -> org.assertj.core.api.Assertions
                            .assertThat(result.getResponse().getStatus())
                            .isNotEqualTo(403));
        }

        @Test
        @DisplayName("TC-SEC-02: POST /forgot-password متاح بدون token")
        void forgotPasswordEndpoint_isPubliclyAccessible() throws Exception {
            mockMvc.perform(post("/api/auth/forgot-password")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"email\":\"test@test.com\"}"))
                    .andExpect(result -> org.assertj.core.api.Assertions
                            .assertThat(result.getResponse().getStatus())
                            .isNotEqualTo(403));
        }

        @Test
        @DisplayName("TC-SEC-03: POST /reset-password متاح بدون token")
        void resetPasswordEndpoint_isPubliclyAccessible() throws Exception {
            mockMvc.perform(post("/api/auth/reset-password")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"email\":\"t@t.com\",\"otp\":\"123\",\"newPassword\":\"P@ss123\"}"))
                    .andExpect(result -> org.assertj.core.api.Assertions
                            .assertThat(result.getResponse().getStatus())
                            .isNotEqualTo(403));
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // نقاط النهاية المحمية — تحتاج مصادقة
    // ═══════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("Protected endpoints — authentication required")
    class ProtectedEndpointTests {

        @Test
        @DisplayName("TC-SEC-04: GET /me بدون token → 401")
        void getMe_withoutToken_returns401() throws Exception {
            mockMvc.perform(get("/api/auth/me"))
                    .andExpect(status().isUnauthorized());
        }

        @Test
        @DisplayName("TC-SEC-05: PUT /users/me/password بدون token → 401")
        void changePassword_withoutToken_returns401() throws Exception {
            mockMvc.perform(put("/api/auth/users/me/password")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"currentPassword\":\"old\",\"newPassword\":\"new\"}"))
                    .andExpect(status().isUnauthorized());
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // اختبارات الحماية من هجمات الطبقة النصية (Injection)
    // ═══════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("Injection attack resistance")
    class InjectionTests {

        @Test
        @DisplayName("TC-SEC-06: XSS payload في identifier → لا يعكسه في الاستجابة")
        void givenXssInIdentifier_whenLogin_thenResponseDoesNotContainScript() throws Exception {
            var result = mockMvc.perform(post("/api/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"identifier\":\"<script>alert(1)</script>\",\"password\":\"p\"}"))
                    .andReturn();

            String body = result.getResponse().getContentAsString();
            org.assertj.core.api.Assertions.assertThat(body)
                    .doesNotContain("<script>");
        }

        @Test
        @DisplayName("TC-SEC-07: LDAP Injection في identifier → لا 500")
        void givenLdapInjection_whenLogin_thenNoServerError() throws Exception {
            mockMvc.perform(post("/api/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"identifier\":\"admin)(|(cn=*\",\"password\":\"p\"}"))
                    .andExpect(result -> org.assertj.core.api.Assertions
                            .assertThat(result.getResponse().getStatus())
                            .isLessThan(500));
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // اختبارات Session الأمنية
    // ═══════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("Session security")
    class SessionSecurityTests {

        @Test
        @DisplayName("TC-SEC-08: GET /session/me بدون جلسة نشطة → 401")
        void getSessionMe_withoutSession_returns401() throws Exception {
            mockMvc.perform(get("/api/auth/session/me"))
                    .andExpect(status().isUnauthorized());
        }

        @Test
        @DisplayName("TC-SEC-09: POST /session/logout بدون جلسة → 200 (idempotent)")
        void sessionLogout_withoutSession_returns200() throws Exception {
            // Logout يجب أن يكون idempotent — ناجح حتى لو لم تكن هناك جلسة
            mockMvc.perform(post("/api/auth/session/logout"))
                    .andExpect(status().isOk());
        }
    }
}
