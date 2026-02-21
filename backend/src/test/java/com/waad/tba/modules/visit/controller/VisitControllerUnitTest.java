package com.waad.tba.modules.visit.controller;

import com.waad.tba.common.dto.ApiResponse;
import com.waad.tba.modules.visit.dto.VisitCreateDto;
import com.waad.tba.modules.visit.dto.VisitResponseDto;
import com.waad.tba.modules.visit.service.VisitService;
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
@DisplayName("VisitController unit tests")
class VisitControllerUnitTest {

    @Mock
    private VisitService visitService;

    private VisitController controller;

    @BeforeEach
    void setUp() {
        controller = new VisitController(visitService);
    }

    @Test
    void createVisit_returnsCreated() {
        VisitCreateDto dto = new VisitCreateDto();
        VisitResponseDto created = new VisitResponseDto();
        when(visitService.create(dto)).thenReturn(created);

        ResponseEntity<ApiResponse<VisitResponseDto>> response = controller.create(dto);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(created, response.getBody().getData());
        verify(visitService).create(dto);
    }

    @Test
    void deleteVisit_returnsOk() {
        ResponseEntity<ApiResponse<Void>> response = controller.delete(17L);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(visitService).delete(17L);
    }

    @Test
    void searchVisit_returnsResults() {
        List<VisitResponseDto> results = List.of(new VisitResponseDto());
        when(visitService.search("v")).thenReturn(results);

        ResponseEntity<ApiResponse<List<VisitResponseDto>>> response = controller.search("v");

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(results, response.getBody().getData());
        verify(visitService).search("v");
    }
}
