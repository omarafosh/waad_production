package com.waad.tba.modules.medicaltaxonomy.enterprise;

import org.junit.jupiter.api.Test;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;

public class VerifySyncResultsTest {
    @Test
    public void verify() {
        String url = "jdbc:postgresql://localhost:5432/tba_waad_system";
        String user = "postgres";
        String password = "postgres";

        try (Connection conn = DriverManager.getConnection(url, user, password);
             Statement stmt = conn.createStatement()) {
            
            System.out.println("=== VERIFICATION RESULTS ===");
            
            // 1. Check legacy medical_services
            ResultSet rs = stmt.executeQuery("SELECT count(*) FROM medical_services WHERE is_master = true");
            if (rs.next()) {
                System.out.println("Legacy Master Services: " + rs.getInt(1));
            }
            
            // 2. Check enterprise medical_services
            rs = stmt.executeQuery("SELECT count(*) FROM ent_medical_services");
            if (rs.next()) {
                System.out.println("Enterprise Master Services: " + rs.getInt(1));
            }
            
            // 3. Check medical_categories
            rs = stmt.executeQuery("SELECT count(*) FROM medical_categories WHERE code LIKE 'CAT-%'");
            if (rs.next()) {
                System.out.println("New Categories Created: " + rs.getInt(1));
            }
            
            // 4. Check ent_provider_raw_services
            rs = stmt.executeQuery("SELECT count(*) FROM ent_provider_raw_services");
            if (rs.next()) {
                System.out.println("Enterprise Raw Services (Mapping Target): " + rs.getInt(1));
            }
            
            // 5. Check mapping status
            rs = stmt.executeQuery("SELECT mapping_status, count(*) FROM ent_provider_raw_services GROUP BY mapping_status");
            System.out.println("\nMapping Status Breakdown:");
            while (rs.next()) {
                System.out.println("- " + rs.getString(1) + ": " + rs.getInt(2));
            }
            
            System.out.println("\n✅ Verification complete.");

        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
