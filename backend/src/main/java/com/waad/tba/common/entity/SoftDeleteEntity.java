package com.waad.tba.common.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

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
    protected Long version = 0L;

    @Column(nullable = false)
    protected boolean active = true;

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
     * Lombok generates isActive() for boolean fields, but some code expects getActive().
     */
    public boolean getActive() {
        return active;
    }

    /**
     * Standard getter for 'active' field.
     * Manually added to ensure availability.
     */
    public boolean isActive() {
        return active;
    }
}
