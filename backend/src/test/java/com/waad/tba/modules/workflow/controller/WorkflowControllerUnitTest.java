package com.waad.tba.modules.workflow.controller;

import com.waad.tba.modules.workflow.entity.ApprovalRequest;
import com.waad.tba.modules.workflow.repository.ApprovalRequestRepository;
import com.waad.tba.modules.workflow.service.WorkflowService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WorkflowControllerUnitTest {

    @Mock
    private WorkflowService workflowService;
    @Mock
    private ApprovalRequestRepository repository;

    private WorkflowController controller;

    @BeforeEach
    void setUp() {
        controller = new WorkflowController(workflowService, repository);
    }

    @Test
    void getPendingRequests_returnsList() {
        List<ApprovalRequest> requests = List.of(new ApprovalRequest());
        when(repository.findByStatus(ApprovalRequest.ApprovalStatus.PENDING)).thenReturn(requests);

        List<ApprovalRequest> response = controller.getPendingRequests();

        assertEquals(requests, response);
        verify(repository).findByStatus(ApprovalRequest.ApprovalStatus.PENDING);
    }

    @Test
    void approve_returnsOk() {
        ResponseEntity<Void> response = controller.approve(7L, "checker", "ok");
        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(workflowService).approveRequest(7L, "checker", "ok");
    }

    @Test
    void preview_returnsMap() {
        Map<String, Object> preview = Map.of("impact", "low");
        when(workflowService.getImpactPreview(7L)).thenReturn(preview);

        Map<String, Object> response = controller.preview(7L);

        assertEquals(preview, response);
        verify(workflowService).getImpactPreview(7L);
    }
}
