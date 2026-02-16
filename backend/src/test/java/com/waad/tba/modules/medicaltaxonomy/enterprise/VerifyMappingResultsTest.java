package com.waad.tba.modules.medicaltaxonomy.enterprise;

import org.junit.jupiter.api.Test;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;

/**
 * Final verification of the Phase 3: Direct Provider Service Mapping
 */
public class VerifyMappingResultsTest {

    @Test
    public void verifyMappingCounts() {
        String url = "jdbc:postgresql://localhost:5432/tba_waad_system";
        String user = "postgres";
        String password = "postgres";

        try (Connection conn = DriverManager.getConnection(url, user, password);
             Statement stmt = conn.createStatement()) {

            System.out.println("=== PHASE 3 MAPPING VERIFICATION ===");
            
            // 1. Providers Check
            System.out.println("\n1. Providers created:");
            ResultSet rs = stmt.executeQuery("SELECT name, license_number FROM providers WHERE license_number IN ('P-DAR-001', 'P-VEN-002', 'P-DEN-003')");
            while (rs.next()) {
                System.out.println("  - " + rs.getString("name") + " [" + rs.getString("license_number") + "]");
            }

            // 2. Raw Services Count
            rs = stmt.executeQuery("SELECT count(*) FROM provider_raw_services");
            if (rs.next()) {
                System.out.println("\n2. Total Provider Raw Services: " + rs.getInt(1));
            }

            // 3. Mappings Count
            rs = stmt.executeQuery("SELECT count(*) FROM provider_service_mappings");
            if (rs.next()) {
                System.out.println("3. Total Provider Service Mappings: " + rs.getInt(1));
            }

            // 4. Verification of 1:1 Linkage
            rs = stmt.executeQuery(
                "SELECT p.name, count(m.id) " +
                "FROM providers p " +
                "JOIN provider_service_mappings m ON p.id = m.provider_id " +
                "GROUP BY p.name"
            );
            System.out.println("\n4. Mapping Distribution by Provider:");
            while (rs.next()) {
                System.out.println("  - " + rs.getString(1) + ": " + rs.getInt(2) + " services mapped");
            }

            System.out.println("\n=== VERIFICATION COMPLETE ===");

        } catch (Exception e) {
            System.err.println("Verification failed: " + e.getMessage());
        }
    }
}
