package com.waad.tba.modules.medicaltaxonomy.enterprise;

import org.junit.jupiter.api.Test;
import java.io.FileWriter;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;

public class GenerateSyncSqlTest {
    @Test
    public void generateSql() {
        String url = "jdbc:postgresql://localhost:5432/tba_waad_system";
        String user = "postgres";
        String password = "postgres";

        try (Connection conn = DriverManager.getConnection(url, user, password);
             Statement stmt = conn.createStatement()) {

            // 1. Get unique categories
            List<String> categories = new ArrayList<>();
            ResultSet rs = stmt.executeQuery("SELECT DISTINCT category FROM ent_medical_services WHERE category IS NOT NULL");
            while (rs.next()) {
                categories.add(rs.getString(1));
            }

            StringBuilder sql = new StringBuilder();
            sql.append("-- UI Data Synchronization & Repair Script\n");
            sql.append("BEGIN;\n");

            sql.append("\n-- 1. Sync Categories\n");
            for (int i = 0; i < categories.size(); i++) {
                String cat = categories.get(i).replace("'", "''");
                String code = String.format("CAT-%03d", i + 1);
                sql.append(String.format("INSERT INTO medical_categories (code, name, active, created_at, updated_at) " +
                           "SELECT '%s', '%s', TRUE, NOW(), NOW() " +
                           "WHERE NOT EXISTS (SELECT 1 FROM medical_categories WHERE name = '%s');\n", 
                           code, cat, cat));
            }

            sql.append("\n-- 2. Populate Legacy Dictionary (medical_services)\n");
            sql.append("INSERT INTO medical_services (code, name, name_en, category_id, is_master, status, active, created_at, updated_at) " +
                       "SELECT e.code, e.name_ar, e.name_en, c.id, TRUE, 'ACTIVE', TRUE, NOW(), NOW() " +
                       "FROM ent_medical_services e " +
                       "JOIN medical_categories c ON e.category = c.name " +
                       "ON CONFLICT (code) DO UPDATE SET " +
                       "name = EXCLUDED.name, name_en = EXCLUDED.name_en, category_id = EXCLUDED.category_id, active = TRUE;\n");

            sql.append("\n-- 3. Populate Enterprise Mapping Tables (ent_provider_raw_services)\n");
            sql.append("INSERT INTO ent_provider_raw_services (provider_id, raw_name, raw_code, mapping_status, created_at, updated_at) " +
                       "SELECT provider_id, service_name, service_code, 'UNMAPPED', NOW(), NOW() " +
                       "FROM provider_raw_services " +
                       "ON CONFLICT (provider_id, raw_code) DO NOTHING;\n");

            // 4. Update mappings to point to ent_medical_services
            sql.append("\n-- 4. Update Mappings in Enterprise Table\n");
            sql.append("UPDATE ent_provider_raw_services prs " +
                       "SET mapped_service_id = m.master_service_id, mapping_status = 'ACTIVE' " +
                       "FROM provider_service_mappings m " +
                       "WHERE prs.provider_id = m.provider_id AND prs.raw_code = m.provider_service_code;\n");

            sql.append("\nCOMMIT;\n");

            try (FileWriter writer = new FileWriter("sync_ui_data.sql")) {
                writer.write(sql.toString());
            }

            System.out.println("✅ Successfully generated sync_ui_data.sql");

        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
