package com.waad.tba.modules.dashboard.controller;

import com.waad.tba.common.dto.ApiResponse;
import com.waad.tba.modules.dashboard.dto.DashboardSummaryDto;
import com.waad.tba.modules.dashboard.dto.MonthlyTrendDto;
import com.waad.tba.modules.dashboard.service.DashboardService;
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
class DashboardControllerUnitTest {

    @Mock
    private DashboardService dashboardService;

    private DashboardController controller;

    @BeforeEach
    void setUp() {
        controller = new DashboardController(dashboardService);
    }

    @Test
    void getSummary_returnsOk() {
        DashboardSummaryDto summary = new DashboardSummaryDto();
        when(dashboardService.getSummary(1L)).thenReturn(summary);

        ResponseEntity<ApiResponse<DashboardSummaryDto>> response = controller.getSummary(1L);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(summary, response.getBody().getData());
        verify(dashboardService).getSummary(1L);
    }

    @Test
    void getMonthlyTrends_returnsOk() {
        List<MonthlyTrendDto> trends = List.of(new MonthlyTrendDto());
        when(dashboardService.getMonthlyTrends(12, null)).thenReturn(trends);

        ResponseEntity<ApiResponse<List<MonthlyTrendDto>>> response = controller.getMonthlyTrends(12, null);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(trends, response.getBody().getData());
        verify(dashboardService).getMonthlyTrends(12, null);
    }
}
