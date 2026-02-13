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
@lombok.experimental.SuperBuilder
@lombok.EqualsAndHashCode(callSuper = true)
@org.hibernate.annotations.SQLDelete(sql = "UPDATE organizations SET deleted = true, deleted_at = NOW() WHERE id = ?")
@org.hibernate.annotations.SQLRestriction("deleted = false")
public class Organization extends com.waad.tba.common.entity.SoftDeleteEntity {

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
    private boolean archived = false;
}
