package com.waad.tba.modules.reviewer.controller;

import com.waad.tba.common.dto.ApiResponse;
import com.waad.tba.modules.reviewer.dto.ReviewerCompanyCreateDto;
import com.waad.tba.modules.reviewer.dto.ReviewerCompanyResponseDto;
import com.waad.tba.modules.reviewer.service.ReviewerCompanyService;
import org.junit.jupiter.api.BeforeEach;
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
class ReviewerCompanyControllerUnitTest {

    @Mock
    private ReviewerCompanyService service;

    private ReviewerCompanyController controller;

    @BeforeEach
    void setUp() {
        controller = new ReviewerCompanyController(service);
    }

    @Test
    void create_returnsCreated() {
        ReviewerCompanyCreateDto dto = new ReviewerCompanyCreateDto();
        ReviewerCompanyResponseDto created = new ReviewerCompanyResponseDto();
        when(service.create(dto)).thenReturn(created);

        ResponseEntity<ApiResponse<ReviewerCompanyResponseDto>> response = controller.create(dto);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(created, response.getBody().getData());
        verify(service).create(dto);
    }

    @Test
    void delete_returnsOk() {
        ResponseEntity<ApiResponse<Void>> response = controller.delete(6L);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(service).delete(6L);
    }

    @Test
    void search_returnsResults() {
        List<ReviewerCompanyResponseDto> list = List.of(new ReviewerCompanyResponseDto());
        when(service.search("rev")).thenReturn(list);

        ResponseEntity<ApiResponse<List<ReviewerCompanyResponseDto>>> response = controller.search("rev");

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(list, response.getBody().getData());
        verify(service).search("rev");
    }
}
