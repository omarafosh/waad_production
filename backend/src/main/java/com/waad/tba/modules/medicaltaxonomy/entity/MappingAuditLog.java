package com.waad.tba.modules.medicaltaxonomy.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * Mapping Audit Log Entity
 * 
 * Tracks history of changes to provider service mappings.
 */
@Entity
@Table(name = "mapping_audit_log")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MappingAuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "mapping_id", nullable = false)
    private Long mappingId;

    @Column(name = "old_master_id")
    private Long oldMasterId;

    @Column(name = "new_master_id")
    private Long newMasterId;

    @Column(name = "reason_code", length = 50)
    private String reasonCode;

    @Column(name = "changed_by", length = 100)
    private String changedBy;

    @CreationTimestamp
    @Column(name = "changed_at", nullable = false, updatable = false)
    private LocalDateTime changedAt;
}
