package com.waad.tba.modules.employer.controller;

import com.waad.tba.common.dto.ApiResponse;
import com.waad.tba.modules.employer.dto.EmployerCreateDto;
import com.waad.tba.modules.employer.dto.EmployerResponseDto;
import com.waad.tba.modules.employer.dto.EmployerUpdateDto;
import com.waad.tba.modules.employer.service.EmployerService;
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

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("EmployerController unit tests")
class EmployerControllerUnitTest {

    @Mock
    private EmployerService employerService;

    private EmployerController employerController;

    @BeforeEach
    void setUp() {
        employerController = new EmployerController(employerService);
    }

    @Test
    @DisplayName("create employer returns 201")
    void createEmployer_returnsCreated() {
        EmployerCreateDto createDto = new EmployerCreateDto();
        EmployerResponseDto created = new EmployerResponseDto();

        when(employerService.create(createDto)).thenReturn(created);

        ResponseEntity<ApiResponse<EmployerResponseDto>> response = employerController.create(createDto);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(created, response.getBody().getData());
        verify(employerService).create(createDto);
    }

    @Test
    @DisplayName("update employer returns 200")
    void updateEmployer_returnsOk() {
        Long employerId = 12L;
        EmployerUpdateDto updateDto = new EmployerUpdateDto();
        EmployerResponseDto updated = new EmployerResponseDto();

        when(employerService.update(employerId, updateDto)).thenReturn(updated);

        ResponseEntity<ApiResponse<EmployerResponseDto>> response = employerController.update(employerId, updateDto);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(updated, response.getBody().getData());
        verify(employerService).update(employerId, updateDto);
    }

    @Test
    @DisplayName("delete employer returns 200")
    void deleteEmployer_returnsOk() {
        Long employerId = 34L;

        ResponseEntity<ApiResponse<Void>> response = employerController.delete(employerId);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(employerService).delete(employerId);
    }

    @Test
    @DisplayName("search employers through getAll returns page")
    void getAllEmployers_returnsPage() {
        Page<EmployerResponseDto> page = new PageImpl<>(List.of(new EmployerResponseDto()));
        when(employerService.getAll(PageRequest.of(0, 10), "tech", false, true, null)).thenReturn(page);

        ResponseEntity<ApiResponse<Page<EmployerResponseDto>>> response = employerController.getAll(
                PageRequest.of(0, 10), "tech", false, true, null);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(page, response.getBody().getData());
        verify(employerService).getAll(PageRequest.of(0, 10), "tech", false, true, null);
    }

    @Test
    @DisplayName("export employers to excel returns bytes")
    void exportEmployers_returnsBytes() throws Exception {
        byte[] excel = new byte[] { 5, 6, 7 };
        when(employerService.exportToExcel()).thenReturn(excel);

        ResponseEntity<byte[]> response = employerController.exportToExcel();

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertArrayEquals(excel, response.getBody());
        verify(employerService).exportToExcel();
    }

    @Test
    @DisplayName("count employers returns total")
    void countEmployers_returnsTotal() {
        when(employerService.count()).thenReturn(44L);

        ResponseEntity<ApiResponse<Long>> response = employerController.count();

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(44L, response.getBody().getData());
        verify(employerService).count();
    }
}
