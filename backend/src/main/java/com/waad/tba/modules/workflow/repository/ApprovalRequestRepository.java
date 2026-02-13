package com.waad.tba.modules.workflow.repository;

import com.waad.tba.modules.workflow.entity.ApprovalRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ApprovalRequestRepository extends JpaRepository<ApprovalRequest, Long> {
    List<ApprovalRequest> findByStatus(ApprovalRequest.ApprovalStatus status);
    List<ApprovalRequest> findByEntityTypeAndEntityIdAndStatus(String entityType, Long entityId, ApprovalRequest.ApprovalStatus status);
}
