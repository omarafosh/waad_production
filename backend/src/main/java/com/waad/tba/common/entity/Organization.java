package com.waad.tba.common.entity;

import com.waad.tba.common.enums.OrganizationType;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "organizations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Organization {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    public Long getId() {
        return id;
    }

    /**
     * Organization name (unified field - supports Arabic and English)
     */
    @Column(nullable = false, length = 255)
    private String name;

    public String getName() { return name; }

    @Column(nullable = false, unique = true, length = 50)
    private String code;

    public String getCode() { return code; }

    @Column(length = 255)
    private String address;

    @Column(length = 20)
    private String phone;

    @Column(length = 100)
    private String email;

    @Builder.Default
    private boolean active = true;

    /**
     * Archive flag - soft delete for employers
     * Archived organizations are hidden from default lists but remain in database
     * with all relations intact (Members, Benefit Policies, Claims, etc.)
     */
    @Builder.Default
    private boolean archived = false;

    @Column(updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = createdAt;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
