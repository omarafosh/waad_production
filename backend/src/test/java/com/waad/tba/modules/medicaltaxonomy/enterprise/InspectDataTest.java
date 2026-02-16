package com.waad.tba.modules.medicaltaxonomy.enterprise;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;
import java.util.Map;

@SpringBootTest
@ActiveProfiles("test")
public class InspectDataTest {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    public void inspectServices() {
        System.out.println("--- Inspecting ent_medical_services ---");
        List<Map<String, Object>> services = jdbcTemplate.queryForList(
            "SELECT id, code, name, category, category_id FROM ent_medical_services LIMIT 10"
        );
        for (Map<String, Object> row : services) {
            System.out.println(row);
        }

        System.out.println("\n--- Inspecting medical_services (Legacy) ---");
        List<Map<String, Object>> legacyServices = jdbcTemplate.queryForList(
            "SELECT id, code, name, category_id FROM medical_services LIMIT 10"
        );
        for (Map<String, Object> row : legacyServices) {
            System.out.println(row);
        }
    }
}
