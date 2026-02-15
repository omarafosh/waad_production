package com.waad.tba.modules.medicaltaxonomy.enterprise.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "ent_mapping_audit_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EnterpriseMappingAuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "mapping_id")
    private Long mappingId;

    @Column(name = "old_master_id")
    private UUID oldMasterId;

    @Column(name = "new_master_id")
    private UUID newMasterId;

    @Column(name = "reason_code")
    private String reasonCode;

    @Column(name = "changed_by")
    private String changedBy;

    @CreationTimestamp
    private LocalDateTime changedAt;
}
