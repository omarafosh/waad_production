package com.waad.tba.modules.claim.controller;

import com.waad.tba.common.dto.ApiResponse;
import com.waad.tba.modules.claim.dto.ClaimCreateDto;
import com.waad.tba.modules.claim.dto.ClaimViewDto;
import com.waad.tba.modules.claim.service.ClaimService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("ClaimController unit tests")
class ClaimControllerUnitTest {

    @Mock
    private ClaimService claimService;

    private ClaimController claimController;

    @BeforeEach
    void setUp() {
        claimController = new ClaimController(claimService);
    }

    @Test
    void createClaim_returnsCreated() {
        ClaimCreateDto dto = new ClaimCreateDto();
        ClaimViewDto created = new ClaimViewDto();
        when(claimService.createClaim(dto)).thenReturn(created);

        ResponseEntity<ApiResponse<ClaimViewDto>> response = claimController.createClaim(dto);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(created, response.getBody().getData());
        verify(claimService).createClaim(dto);
    }

    @Test
    void deleteClaim_returnsOk() {
        ResponseEntity<ApiResponse<Void>> response = claimController.deleteClaim(9L);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(claimService).deleteClaim(9L);
    }

    @Test
    void searchClaim_returnsResults() {
        List<ClaimViewDto> results = List.of(new ClaimViewDto());
        when(claimService.search(1L, "claim")).thenReturn(results);

        ResponseEntity<ApiResponse<List<ClaimViewDto>>> response = claimController.search(1L, "claim");

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(results, response.getBody().getData());
        verify(claimService).search(1L, "claim");
    }
}
