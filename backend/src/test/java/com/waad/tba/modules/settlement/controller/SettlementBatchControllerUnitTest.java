package com.waad.tba.modules.settlement.controller;

import com.waad.tba.modules.settlement.dto.BatchSummaryDTO;
import com.waad.tba.modules.settlement.dto.CreateBatchRequest;
import com.waad.tba.modules.settlement.service.SettlementBatchService;
import com.waad.tba.security.UserPrincipal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SettlementBatchControllerUnitTest {

    @Mock
    private SettlementBatchService batchService;
    @Mock
    private com.waad.tba.security.AuthorizationService authorizationService;
    @Mock
    private com.waad.tba.modules.rbac.repository.UserRepository userRepository;

    private SettlementBatchController controller;

    @BeforeEach
    void setUp() {
        controller = new SettlementBatchController(batchService, authorizationService, userRepository);
    }

    @Test
    void createBatch_returnsCreated() {
        CreateBatchRequest request = new CreateBatchRequest();
        BatchSummaryDTO summary = new BatchSummaryDTO();
        UserPrincipal principal = UserPrincipal.builder()
            .id(11L)
            .username("settlement-user")
            .password("pwd")
            .email("settlement@test.com")
            .authorities(java.util.List.of())
            .build();
        when(batchService.createBatch(request, 11L)).thenReturn(summary);

        ResponseEntity<BatchSummaryDTO> response = controller.createBatch(request, principal);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertEquals(summary, response.getBody());
        verify(batchService).createBatch(request, 11L);
    }

    @Test
    void getBatch_returnsOk() {
        BatchSummaryDTO summary = new BatchSummaryDTO();
        when(batchService.getBatchSummary(5L)).thenReturn(summary);

        ResponseEntity<BatchSummaryDTO> response = controller.getBatch(5L);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(summary, response.getBody());
        verify(batchService).getBatchSummary(5L);
    }
}
