package com.waad.tba;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import java.util.List;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
class FlywayMigrationVerificationTest {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void testFlywayMigrationsAndSchema() {
        System.out.println("==================================================");
        System.out.println("STARTING FLYWAY MIGRATION VERIFICATION");
        System.out.println("==================================================");

        // 1. Verify Flyway History for V111-V115
        String sql = "SELECT version, description, success, installed_on FROM flyway_schema_history " +
                     "WHERE version IN ('111', '112', '113', '114', '115') " +
                     "ORDER BY version";
        
        List<Map<String, Object>> migrations = jdbcTemplate.queryForList(sql);
        
        System.out.println("Found " + migrations.size() + " target migrations (V111-V115).");

        for (Map<String, Object> m : migrations) {
            String v = (String) m.get("version");
            Boolean success = (Boolean) m.get("success");
            System.out.println("Migration " + v + " (" + m.get("description") + "): " + (success ? "SUCCESS" : "FAIL"));
            assertTrue(success, "Migration V" + v + " failed or marked as failed in history.");
        }

        // 2. Verify 'members' Table Structure (Critical Columns)
        try {
            // Check existence and nullable/unique properties indirectly via usage or info schema
            // Checking availability by selecting them
            jdbcTemplate.execute("SELECT barcode, card_number, national_number, gender, birth_date FROM members LIMIT 1");
            System.out.println("✅ Critical columns (barcode, card_number, national_number, gender, birth_date) exist in 'members'.");
        } catch (Exception e) {
            fail("❌ Critical columns missing in 'members' table: " + e.getMessage());
        }

        // 3. Verify Indexes (PostgreSQL specific)
        String indexSql = "SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'members'";
        List<Map<String, Object>> indexes = jdbcTemplate.queryForList(indexSql);
        
        System.out.println("Checking Indexes on 'members'...");
        boolean hasBarcodeIdx = false;
        boolean hasCardNumIdx = false;
        boolean hasFuzzyIdx = false; // logic might vary for fuzzy name

        for (Map<String, Object> idx : indexes) {
            String name = (String) idx.get("indexname");
            String def = (String) idx.get("indexdef");
            System.out.println(" - Found Index: " + name); // + " [" + def + "]");

            if ("idx_members_barcode".equals(name)) hasBarcodeIdx = true;
            if ("idx_members_card_number".equals(name) || "uk_member_card_number_partial".equals(name)) hasCardNumIdx = true;
            if ("idx_members_fullname_gin_trgm".equals(name)) hasFuzzyIdx = true;
        }

        assertTrue(hasBarcodeIdx, "Index 'idx_members_barcode' is MISSING.");
        // V113 creates idx_members_card_number. V111 created uk_member_card_number_partial. Both are good signs.
        assertTrue(hasCardNumIdx, "Index for card_number is MISSING.");
        assertTrue(hasFuzzyIdx, "Index 'idx_members_fullname_gin_trgm' is MISSING.");

        System.out.println("✅ All critical indexes found.");
        
        System.out.println("==================================================");
        System.out.println("VERIFICATION COMPLETE - SYSTEM IS READY");
        System.out.println("==================================================");
    }
}
