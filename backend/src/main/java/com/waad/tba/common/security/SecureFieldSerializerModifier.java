package com.waad.tba.common.security;

import com.fasterxml.jackson.databind.BeanDescription;
import com.fasterxml.jackson.databind.SerializationConfig;
import com.fasterxml.jackson.databind.ser.BeanPropertyWriter;
import com.fasterxml.jackson.databind.ser.BeanSerializerModifier;
import com.waad.tba.common.annotation.SecureField;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationContext;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Modifier to inject SecureFieldSerializer into fields annotated with @SecureField.
 */
@Component
@RequiredArgsConstructor
public class SecureFieldSerializerModifier extends BeanSerializerModifier {

    private final ApplicationContext applicationContext;

    @Override
    public List<BeanPropertyWriter> changeProperties(SerializationConfig config, BeanDescription beanDesc, List<BeanPropertyWriter> beanProperties) {
        return beanProperties.stream().map(writer -> {
            SecureField annotation = writer.getAnnotation(SecureField.class);
            if (annotation != null) {
                return new BeanPropertyWriter(writer) {
                    @Override
                    public void serializeAsField(Object bean, com.fasterxml.jackson.core.JsonGenerator gen, com.fasterxml.jackson.databind.SerializerProvider prov) throws Exception {
                        // Use the custom serializer
                        SecureFieldSerializer secureSerializer = new SecureFieldSerializer(writer.getSerializer(), annotation, applicationContext);
                        
                        Object value = writer.get(bean);
                        gen.writeFieldName(writer.getName());
                        secureSerializer.serialize(value, gen, prov);
                    }
                };
            }
            return writer;
        }).collect(Collectors.toList());
    }
}
