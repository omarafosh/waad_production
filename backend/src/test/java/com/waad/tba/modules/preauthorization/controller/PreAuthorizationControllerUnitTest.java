package com.waad.tba.modules.preauthorization.controller;

import com.waad.tba.common.dto.ApiResponse;
import com.waad.tba.modules.preauthorization.dto.PreAuthorizationApproveDto;
import com.waad.tba.modules.preauthorization.dto.PreAuthorizationCreateDto;
import com.waad.tba.modules.preauthorization.dto.PreAuthorizationResponseDto;
import com.waad.tba.modules.preauthorization.service.PreAuthorizationAttachmentService;
import com.waad.tba.modules.preauthorization.service.PreAuthorizationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("PreAuthorizationController unit tests")
class PreAuthorizationControllerUnitTest {

    @Mock
    private PreAuthorizationService preAuthorizationService;
    @Mock
    private PreAuthorizationAttachmentService attachmentService;

    private PreAuthorizationController controller;

    @BeforeEach
    void setUp() {
        controller = new PreAuthorizationController(preAuthorizationService, attachmentService);
    }

    @Test
    void createPreAuthorization_returnsCreated() {
        PreAuthorizationCreateDto dto = new PreAuthorizationCreateDto();
        dto.setMemberId(10L);
        PreAuthorizationResponseDto responseDto = new PreAuthorizationResponseDto();

        when(preAuthorizationService.createPreAuthorization(dto, "system")).thenReturn(responseDto);

        ResponseEntity<ApiResponse<PreAuthorizationResponseDto>> response = controller.createPreAuthorization(dto, null);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(responseDto, response.getBody().getData());
        verify(preAuthorizationService).createPreAuthorization(dto, "system");
    }

    @Test
    void approvePreAuthorization_returnsOk() {
        PreAuthorizationApproveDto dto = new PreAuthorizationApproveDto();
        PreAuthorizationResponseDto responseDto = new PreAuthorizationResponseDto();
        when(preAuthorizationService.approvePreAuthorization(12L, dto, "system")).thenReturn(responseDto);

        ResponseEntity<ApiResponse<PreAuthorizationResponseDto>> response = controller.approvePreAuthorization(12L, dto, null);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(responseDto, response.getBody().getData());
        verify(preAuthorizationService).approvePreAuthorization(12L, dto, "system");
    }

    @Test
    void deletePreAuthorization_returnsOk() {
        ResponseEntity<ApiResponse<Void>> response = controller.deletePreAuthorization(13L, null);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(preAuthorizationService).deletePreAuthorization(13L, "system");
    }
}
