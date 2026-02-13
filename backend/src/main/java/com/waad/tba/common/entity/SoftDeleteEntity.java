package com.waad.tba.common.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.Builder;

import java.time.LocalDateTime;

/**
 * Base entity for Soft Delete support and Auditing.
 * 
 * Features:
 * 1. Soft Delete: via 'active' flag.
 * 2. Auditing: createdAt, updatedAt automated maintenance.
 * 
 * Usage:
 * Extend this class and add @SQLDelete(sql = "UPDATE table_name SET active = false WHERE id = ?") 
 * and @Where(clause = "active = true") to the subclass.
 */
@MappedSuperclass
@Getter
@Setter
@lombok.experimental.SuperBuilder
@lombok.NoArgsConstructor
@lombok.AllArgsConstructor
public abstract class SoftDeleteEntity {

    @Version
    @Column(name = "version")
    @Builder.Default
    protected Long version = 0L;

    /**
     * active: Business status (Enabled/Disabled)
     */
    @Column(nullable = false)
    @Builder.Default
    protected boolean active = true;

    /**
     * deleted: System status (Soft Delete)
     */
    @Column(name = "deleted", nullable = false)
    @Builder.Default
    protected boolean deleted = false;

    @Column(name = "deleted_at")
    protected LocalDateTime deletedAt;

    @Column(name = "deleted_by", length = 100)
    protected String deletedBy;

    @Column(name = "valid_from")
    protected LocalDateTime validFrom;

    @Column(name = "valid_to")
    protected LocalDateTime validTo;

    /**
     * Audit: creation timestamp
     */
    @Column(name = "created_at", nullable = false, updatable = false)
    protected LocalDateTime createdAt;

    /**
     * Audit: last update timestamp
     */
    @Column(name = "updated_at", nullable = false)
    protected LocalDateTime updatedAt;

    @Column(name = "created_by", length = 100, updatable = false)
    protected String createdBy;

    @Column(name = "updated_by", length = 100)
    protected String updatedBy;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = createdAt;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    /**
     * Compatibility getter for 'active' field.
     */
    public boolean getActive() {
        return active;
    }

    public boolean isActive() {
        return active;
    }

    public boolean isDeleted() {
        return deleted;
    }
}
