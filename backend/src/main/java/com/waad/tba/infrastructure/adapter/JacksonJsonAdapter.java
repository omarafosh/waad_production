package com.waad.tba.infrastructure.adapter;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.waad.tba.infrastructure.port.JsonService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * محول (Adapter) لمكتبة Jackson لتنفيذ واجهة JsonService.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class JacksonJsonAdapter implements JsonService {

    private final ObjectMapper objectMapper;

    @Override
    public String toJson(Object object) {
        try {
            return objectMapper.writeValueAsString(object);
        } catch (JsonProcessingException e) {
            log.error("خطأ أثناء تحويل الكائن إلى JSON", e);
            throw new RuntimeException("Error converting object to JSON", e);
        }
    }

    @Override
    public <T> T fromJson(String json, Class<T> clazz) {
        try {
            return objectMapper.readValue(json, clazz);
        } catch (JsonProcessingException e) {
            log.error("خطأ أثناء تحويل الـ JSON إلى كائن من نوع {}", clazz.getSimpleName(), e);
            throw new RuntimeException("Error parsing JSON to object", e);
        }
    }

    @Override
    public <T> T convertValue(Object from, Class<T> clazz) {
        try {
            return objectMapper.convertValue(from, clazz);
        } catch (Exception e) {
            log.error("خطأ أثناء تحويل القيم من {} إلى {}", from.getClass().getSimpleName(), clazz.getSimpleName(), e);
            throw new RuntimeException("Error converting value", e);
        }
    }
}
