package com.waad.tba.common.security;

import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.databind.JsonSerializer;
import com.fasterxml.jackson.databind.SerializerProvider;
import com.waad.tba.common.annotation.SecureField;
import com.waad.tba.security.AuthorizationService;
import com.waad.tba.modules.rbac.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationContext;
import org.springframework.stereotype.Component;

import java.io.IOException;

/**
 * Custom Jackson serializer for fields marked with @SecureField.
 * Decides whether to show, mask, or hide the field based on user permissions.
 */
public class SecureFieldSerializer extends JsonSerializer<Object> {

    private final JsonSerializer<Object> defaultSerializer;
    private final SecureField annotation;
    private final ApplicationContext applicationContext;

    public SecureFieldSerializer(JsonSerializer<Object> defaultSerializer, SecureField annotation, ApplicationContext applicationContext) {
        this.defaultSerializer = defaultSerializer;
        this.annotation = annotation;
        this.applicationContext = applicationContext;
    }

    @Override
    public void serialize(Object value, JsonGenerator gen, SerializerProvider serializers) throws IOException {
        AuthorizationService authService = applicationContext.getBean(AuthorizationService.class);
        User currentUser = authService.getCurrentUser();

        boolean hasAccess = false;
        
        if (currentUser != null) {
            if (authService.isAdmin(currentUser)) {
                hasAccess = true;
            } else if (!annotation.permission().isEmpty()) {
                hasAccess = authService.hasPermission(currentUser, annotation.permission());
            }
        }

        if (hasAccess) {
            if (defaultSerializer != null) {
                defaultSerializer.serialize(value, gen, serializers);
            } else {
                gen.writeObject(value);
            }
        } else {
            if (annotation.mask() && value != null) {
                gen.writeString("****");
            } else {
                gen.writeNull();
            }
        }
    }
}
