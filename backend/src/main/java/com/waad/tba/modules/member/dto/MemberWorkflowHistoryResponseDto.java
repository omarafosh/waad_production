package com.waad.tba.modules.member.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MemberWorkflowHistoryResponseDto {
    private Long id;
    private String fromStatus;
    private String toStatus;
    private LocalDateTime changedAt;
    private String changedBy;
    private String reason;
}
