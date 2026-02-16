package com.waad.tba.modules.medicaltaxonomy.enterprise;

import org.junit.jupiter.api.Test;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;

public class CheckCategoriesTest {
    @Test
    public void dumpCategories() {
        String url = "jdbc:postgresql://localhost:5432/tba_waad_system";
        String user = "postgres";
        String password = "postgres";

        try (Connection conn = DriverManager.getConnection(url, user, password);
             Statement stmt = conn.createStatement()) {

            System.out.println("=== EXISTING CATEGORIES ===");
            ResultSet rs = stmt.executeQuery("SELECT id, name, code FROM medical_categories");
            while (rs.next()) {
                System.out.println(String.format("ID: %s | Code: %s | Name: %s", 
                                   rs.getLong("id"), rs.getString("code"), rs.getString("name")));
            }
            
            System.out.println("\n=== UNIQUE CATEGORIES IN ent_medical_services ===");
            rs = stmt.executeQuery("SELECT DISTINCT category FROM ent_medical_services");
            while (rs.next()) {
                System.out.println("Category: " + rs.getString(1));
            }

        } catch (Exception e) {
            System.err.println("Failed: " + e.getMessage());
        }
    }
}
