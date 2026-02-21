package com.waad.tba.v3.core.infrastructure.excel;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Annotation to mark a DTO field as an Excel column.
 */
@Target(ElementType.FIELD)
@Retention(RetentionPolicy.RUNTIME)
public @interface ExcelColumn {
    String name();
    int order() default 0;
    boolean required() default false;
    String description() default "";
}
