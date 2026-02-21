package com.waad.tba.common.entity;

import jakarta.persistence.MappedSuperclass;
import lombok.Getter;
import lombok.Setter;
import lombok.experimental.SuperBuilder;
import lombok.NoArgsConstructor;

/**
 * Base entity for basic fields.
 */
@MappedSuperclass
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
public abstract class BaseEntity {
}
