package com.waad.tba.modules.reviewer.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * Legacy reviewer company entity - READ ONLY.
 * 
 * @deprecated Use {@link com.waad.tba.common.entity.Organization} with type=REVIEWER instead.
 *             This entity is kept for backward compatibility only. All new code must use Organization.
 *             Writing to this entity is prohibited - use Organization with OrganizationType.REVIEWER.
 */
@Deprecated
@Entity
@Table(name = "reviewer_companies")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class ReviewerCompany {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    private String medicalDirector;
    
    private String phone;
    
    private String email;
    
    private String address;

    @Builder.Default
    private Boolean active = true;

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;
}
