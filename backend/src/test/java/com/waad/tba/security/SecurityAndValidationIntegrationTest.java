package com.waad.tba.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.waad.tba.modules.member.dto.MemberCreateDto;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public class SecurityAndValidationIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    public void testRateLimitingOnLogin() throws Exception {
        String loginJson = "{\"username\":\"admin\",\"password\":\"wrong-pass\"}";
        
        // Send 5 requests (Limit is 5 per minute)
        for (int i = 0; i < 5; i++) {
            mockMvc.perform(post("/api/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(loginJson))
                    .andExpect(status().isUnauthorized()); // Assuming unauthorized for wrong pass
        }

        // 6th request should be Rate Limited (429)
        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(loginJson))
                .andExpect(status().isTooManyRequests());
    }

    @Test
    public void testDtoValidationOnMemberCreate() throws Exception {
        // Create invalid DTO (missing mandatory fields like policyNumber, startDate)
        MemberCreateDto invalidDto = MemberCreateDto.builder()
                .fullName("") // Empty name
                .employerId(1L)
                .build();

        mockMvc.perform(post("/api/unified-members")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(invalidDto)))
                .andExpect(status().isBadRequest()); // Should return 400 Bad Request
    }
}
