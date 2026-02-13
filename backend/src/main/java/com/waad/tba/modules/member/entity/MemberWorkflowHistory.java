package com.waad.tba.modules.member.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "member_workflow_history")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MemberWorkflowHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id", nullable = false)
    private Member member;

    @Column(name = "from_status")
    private String fromStatus;

    @Column(name = "to_status")
    private String toStatus;

    @Column(name = "changed_at", nullable = false)
    private LocalDateTime changedAt;

    @Column(name = "changed_by")
    private String changedBy;

    private String reason;
}
