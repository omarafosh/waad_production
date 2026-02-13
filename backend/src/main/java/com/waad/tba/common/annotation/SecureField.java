package com.waad.tba.common.annotation;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Annotation to mark a field as sensitive and require specific permissions to view.
 */
@Target(ElementType.FIELD)
@Retention(RetentionPolicy.RUNTIME)
public @interface SecureField {
    /**
     * The permission required to view this field.
     * If not specified, the field is hidden by default for non-admins.
     */
    String permission() default "";

    /**
     * Whether to mask the field (e.g., ****) or set it to null.
     */
    boolean mask() default false;
}
