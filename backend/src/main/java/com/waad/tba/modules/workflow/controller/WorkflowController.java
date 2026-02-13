package com.waad.tba.modules.workflow.controller;

import com.waad.tba.modules.workflow.entity.ApprovalRequest;
import com.waad.tba.modules.workflow.service.WorkflowService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/approvals")
@RequiredArgsConstructor
public class WorkflowController {

    private final WorkflowService workflowService;
    private final com.waad.tba.modules.workflow.repository.ApprovalRequestRepository repository;

    @GetMapping("/pending")
    public List<ApprovalRequest> getPendingRequests() {
        return repository.findByStatus(ApprovalRequest.ApprovalStatus.PENDING);
    }

    @PostMapping("/{id}/approve")
    public ResponseEntity<Void> approve(@PathVariable Long id, @RequestParam String checker, @RequestBody(required = false) String notes) {
        workflowService.approveRequest(id, checker, notes);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<Void> reject(@PathVariable Long id, @RequestParam String checker, @RequestBody(required = false) String notes) {
        workflowService.rejectRequest(id, checker, notes);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{id}/preview")
    public Map<String, Object> preview(@PathVariable Long id) {
        return workflowService.getImpactPreview(id);
    }
}
