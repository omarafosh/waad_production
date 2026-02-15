package com.waad.tba.modules.rbac.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.experimental.SuperBuilder;
import com.waad.tba.common.entity.SoftDeleteEntity;
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.SQLRestriction;

@Entity
@Table(name = "permissions")
@Data
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
@SQLDelete(sql = "UPDATE permissions SET active = false, deleted = true, deleted_at = NOW() WHERE id = ?")
@SQLRestriction("active = true")
public class Permission extends SoftDeleteEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String name;

    @Column(name = "name_ar")
    private String nameAr;

    private String description;

    @Column(name = "description_ar", length = 500)
    private String descriptionAr;

    @Column(name = "module", length = 50)
    private String module;

    @Column(name = "module_name", length = 100)
    private String moduleName;

    @Enumerated(EnumType.STRING)
    @Column(name = "category", length = 50)
    @Builder.Default
    private PermissionCategory category = PermissionCategory.GENERAL;
}
