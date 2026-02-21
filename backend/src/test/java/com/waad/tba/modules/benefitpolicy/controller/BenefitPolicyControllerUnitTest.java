package com.waad.tba.modules.benefitpolicy.controller;

import com.waad.tba.common.dto.ApiResponse;
import com.waad.tba.modules.benefitpolicy.dto.BenefitPolicyCreateDto;
import com.waad.tba.modules.benefitpolicy.dto.BenefitPolicyResponseDto;
import com.waad.tba.modules.benefitpolicy.service.BenefitPolicyService;
import com.waad.tba.security.AuthorizationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("BenefitPolicyController unit tests")
class BenefitPolicyControllerUnitTest {

    @Mock
    private BenefitPolicyService benefitPolicyService;
    @Mock
    private AuthorizationService authorizationService;

    private BenefitPolicyController controller;

    @BeforeEach
    void setUp() {
        controller = new BenefitPolicyController(benefitPolicyService, authorizationService);
    }

    @Test
    void createBenefitPolicy_returnsCreated() {
        BenefitPolicyCreateDto dto = new BenefitPolicyCreateDto();
        BenefitPolicyResponseDto created = new BenefitPolicyResponseDto();
        when(benefitPolicyService.create(dto)).thenReturn(created);

        ResponseEntity<ApiResponse<BenefitPolicyResponseDto>> response = controller.create(dto);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(created, response.getBody().getData());
        verify(benefitPolicyService).create(dto);
    }

    @Test
    void searchBenefitPolicy_returnsPage() {
        Page<BenefitPolicyResponseDto> page = new PageImpl<>(List.of(new BenefitPolicyResponseDto()));
        when(benefitPolicyService.search("std", PageRequest.of(0, 20))).thenReturn(page);

        ResponseEntity<ApiResponse<Page<BenefitPolicyResponseDto>>> response = controller.search("std", 0, 20);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(page, response.getBody().getData());
        verify(benefitPolicyService).search("std", PageRequest.of(0, 20));
    }

    @Test
    void findById_returnsOk() {
        BenefitPolicyResponseDto dto = new BenefitPolicyResponseDto();
        when(benefitPolicyService.findById(30L)).thenReturn(dto);

        ResponseEntity<ApiResponse<BenefitPolicyResponseDto>> response = controller.findById(30L);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(dto, response.getBody().getData());
        verify(benefitPolicyService).findById(30L);
    }
}
