package com.waad.tba.modules.medicaltaxonomy.enterprise;

import org.junit.jupiter.api.Test;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;

public class VerifyUnifiedDictionaryTest {

    @Test
    public void verifyData() {
        String url = "jdbc:postgresql://localhost:5432/tba_waad_system";
        String user = "postgres";
        String password = "postgres";

        try (Connection conn = DriverManager.getConnection(url, user, password);
             Statement stmt = conn.createStatement()) {

            System.out.println("Starting data verification...");
            
            // 1. Total Count
            ResultSet rs = stmt.executeQuery("SELECT count(*) FROM ent_medical_services");
            if (rs.next()) {
                System.out.println("Total records in ent_medical_services: " + rs.getInt(1));
            }

            // 2. Sample Records
            System.out.println("\nSample Records (First 5):");
            rs = stmt.executeQuery("SELECT code, name_ar, name_en, category, service_type FROM ent_medical_services LIMIT 5");
            while (rs.next()) {
                System.out.println(String.format("Code: %s | AR: %s | EN: %s | Cat: %s | Type: %s",
                                   rs.getString("code"), rs.getString("name_ar"), 
                                   rs.getString("name_en"), rs.getString("category"),
                                   rs.getString("service_type")));
            }

            // 3. Service Type Distribution
            System.out.println("\nService Type Distribution:");
            rs = stmt.executeQuery("SELECT service_type, count(*) FROM ent_medical_services GROUP BY service_type");
            while (rs.next()) {
                System.out.println(rs.getString("service_type") + ": " + rs.getInt(2));
            }

        } catch (Exception e) {
            System.err.println("Verification failed: " + e.getMessage());
        }
    }
}
