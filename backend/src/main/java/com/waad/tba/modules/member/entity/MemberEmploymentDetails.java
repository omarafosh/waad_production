package com.waad.tba.modules.member.entity;

import java.time.LocalDate;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.validation.constraints.NotNull;

import com.waad.tba.common.entity.Organization;
import com.waad.tba.common.entity.BaseEntity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

/**
 * Member Employment Details Entity
 * Normalized from Member entity to separate employment information.
 * Tracks specific employment records for a member (Principal).
 */
@Entity
@Table(name = "member_employment_details", uniqueConstraints = {
        @UniqueConstraint(name = "uk_member_active_employment", columnNames = { "member_id", "employer_org_id",
                "active" })
})
@Data
@lombok.experimental.SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
public class MemberEmploymentDetails extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id", nullable = false)
    private Member member;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employer_org_id", nullable = false)
    private Organization employer;

    @Column(name = "employee_number", length = 100)
    private String employeeNumber;

    @Column(length = 100)
    private String department;

    @Column(length = 100)
    private String designation;

    @Column(name = "join_date")
    private LocalDate joinDate;

    @Column(name = "cost_center", length = 100)
    private String costCenter;

    @Column(length = 100)
    private String occupation;

    @Column(name = "salary_band", length = 50)
    private String salaryBand;

    @Column(name = "valid_from")
    private LocalDate validFrom;

    @Column(name = "valid_to")
    private LocalDate validTo;

    @Builder.Default
    @Column(nullable = false)
    private boolean active = true;
}
