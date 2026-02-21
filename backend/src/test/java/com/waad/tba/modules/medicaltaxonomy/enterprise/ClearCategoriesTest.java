package com.waad.tba.modules.medicaltaxonomy.enterprise;

import org.junit.jupiter.api.Test;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;

public class ClearCategoriesTest {
    @Test
    public void clear() {
        String url = "jdbc:postgresql://localhost:5432/tba_waad_system";
        String user = "postgres";
        String password = "postgres";

        try (Connection conn = DriverManager.getConnection(url, user, password);
             Statement stmt = conn.createStatement()) {
            
            System.out.println("Clearing and resizing category columns...");
            // Increase BOTH code and name just in case
            stmt.execute("ALTER TABLE medical_categories ALTER COLUMN code TYPE VARCHAR(255)");
            stmt.execute("ALTER TABLE medical_categories ALTER COLUMN name TYPE VARCHAR(255)");
            
            // Delete previously failed inserts to start clean
            stmt.execute("DELETE FROM medical_categories WHERE code LIKE 'CAT-%'");
            System.out.println("✅ Categories cleared and resized.");

        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
