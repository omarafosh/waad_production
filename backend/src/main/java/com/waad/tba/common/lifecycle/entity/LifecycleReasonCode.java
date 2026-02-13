package com.waad.tba.common.lifecycle.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "lifecycle_reason_codes")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class LifecycleReasonCode {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false, unique = true, length = 50)
    private String code;

    @Column(name = "label_ar", nullable = false, length = 200)
    private String labelAr;

    @Column(name = "label_en", length = 200)
    private String labelEn;

    /**
     * Entities this reason applies to (e.g., POLICY, CLAIM, MEMBER)
     * Stored as array in PostgreSQL
     */
    @Column(name = "applicable_entities", columnDefinition = "TEXT[]")
    private String[] applicableEntities;

    /**
     * Actions this reason applies to (e.g., CANCEL, TERMINATE)
     * Stored as array in PostgreSQL
     */
    @Column(name = "applicable_actions", columnDefinition = "TEXT[]")
    private String[] applicableActions;

    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
