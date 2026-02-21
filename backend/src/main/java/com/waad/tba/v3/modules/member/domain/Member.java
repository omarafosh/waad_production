package com.waad.tba.v3.modules.member.domain;

import com.waad.tba.v3.core.base.domain.BaseEntity;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.SQLRestriction;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * Unified Member Entity for Version 3.
 * Handles both Principal and Dependent members using a self-referencing relationship.
 */
@Entity
@Table(name = "v3_members")
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SQLDelete(sql = "UPDATE v3_members SET active = false, updated_at = NOW() WHERE id = ?")
@SQLRestriction("active = true")
public class Member extends BaseEntity {

    @NotBlank(message = "Full name is required")
    @Column(nullable = false, length = 200)
    private String fullName;

    @Column(unique = true, length = 50)
    private String civilId;

    @Column(unique = true, length = 50)
    private String cardNumber;

    @Column(unique = true, length = 100)
    private String barcode;

    private LocalDate birthDate;

    @Enumerated(EnumType.STRING)
    private Gender gender;

    @Enumerated(EnumType.STRING)
    private MemberStatus status = MemberStatus.ACTIVE;

    // --- Family Structure ---

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    private Member parent;

    @OneToMany(mappedBy = "parent", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Member> dependents = new ArrayList<>();

    @Enumerated(EnumType.STRING)
    private Relationship relationship; // Null for Principal

    // --- Business Logic ---

    public boolean isPrincipal() {
        return parent == null;
    }

    public boolean isDependent() {
        return parent != null;
    }

    public void addDependent(Member dependent) {
        dependent.setParent(this);
        this.dependents.add(dependent);
    }

    // --- Enums ---

    public enum Gender {
        MALE, FEMALE, OTHER
    }

    public enum MemberStatus {
        ACTIVE, SUSPENDED, TERMINATED, PENDING
    }

    public enum Relationship {
        WIFE, HUSBAND, SON, DAUGHTER, FATHER, MOTHER, BROTHER, SISTER
    }
}
