package com.waad.tba.modules.rbac.entity;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;
import com.waad.tba.common.entity.Organization;
import com.waad.tba.common.entity.SoftDeleteEntity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.SQLRestriction;

@Entity
@Table(name = "users")
@Data
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
@SQLDelete(sql = "UPDATE users SET active = false, deleted = true, deleted_at = NOW() WHERE id = ?")
@SQLRestriction("active = true")
public class User extends SoftDeleteEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String username;

    @Column(nullable = false)
    private String password;

    @Column(nullable = false)
    private String fullName;

    @Column(name = "civil_id", unique = true)
    private String civilId;

    @Column(unique = true, nullable = false)
    private String email;

    private String phone;

    @Column(name = "profile_image_url")
    private String profileImageUrl;

    @Column(name = "password_changed_at")
    private LocalDateTime passwordChangedAt;

    @Column(name = "email_verified")
    @Builder.Default
    private Boolean emailVerified = false;

    /**
     * Employer ID - for EMPLOYER_ADMIN users
     */
    @Column(name = "employer_id")
    private Long employerId;

    /**
     * Provider ID - for PROVIDER users
     */
    @Column(name = "provider_id")
    private Long providerId;

    /**
     * Company ID - for INSURANCE / TPA users
     */
    @Column(name = "company_id")
    private Long companyId;

    @Column(name = "can_view_members")
    @Builder.Default
    private Boolean canViewMembers = true;

    @Column(name = "can_view_benefit_policies")
    @Builder.Default
    private Boolean canViewBenefitPolicies = true;

    @Column(name = "allow_all_companies")
    @Builder.Default
    private Boolean allowAllCompanies = true;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "user_permitted_organizations",
            joinColumns = @JoinColumn(name = "user_id"),
            inverseJoinColumns = @JoinColumn(name = "organization_id")
    )
    @Builder.Default
    private Set<Organization> permittedOrganizations = new HashSet<>();

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
            name = "user_roles",
            joinColumns = @JoinColumn(name = "user_id"),
            inverseJoinColumns = @JoinColumn(name = "role_id")
    )
    @Builder.Default
    private Set<Role> roles = new HashSet<>();

    @Column(name = "failed_login_count", nullable = false)
    @Builder.Default
    private Integer failedLoginCount = 0;

    @Column(name = "locked_until")
    private LocalDateTime lockedUntil;

    @Column(name = "last_login_at")
    private LocalDateTime lastLoginAt;

    // Helper Methods are kept as they contain business logic
    public boolean isLocked() {
        if (lockedUntil == null) {
            return false;
        }
        return LocalDateTime.now().isBefore(lockedUntil);
    }

    public void lockAccount() {
        this.lockedUntil = LocalDateTime.now().plusMinutes(30);
    }

    public void unlockAccount() {
        this.lockedUntil = null;
        this.failedLoginCount = 0;
    }

    public void incrementFailedLoginCount() {
        this.failedLoginCount++;
        if (this.failedLoginCount >= 5) {
            lockAccount();
        }
    }

    public void resetFailedLoginCount() {
        this.failedLoginCount = 0;
        this.lockedUntil = null;
    }

    public void updateLastLogin() {
        this.lastLoginAt = LocalDateTime.now();
    }
}
