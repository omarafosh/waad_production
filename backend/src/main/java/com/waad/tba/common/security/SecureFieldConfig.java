package com.waad.tba.common.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.module.SimpleModule;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;

import jakarta.annotation.PostConstruct;

@Configuration
@RequiredArgsConstructor
public class SecureFieldConfig {

    private final ObjectMapper objectMapper;
    private final SecureFieldSerializerModifier modifier;

    @PostConstruct
    public void registerSecureFieldModifier() {
        SimpleModule module = new SimpleModule();
        module.setSerializerModifier(modifier);
        objectMapper.registerModule(module);
    }
}
