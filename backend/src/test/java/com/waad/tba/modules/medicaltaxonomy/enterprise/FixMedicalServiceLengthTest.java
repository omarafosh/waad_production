package com.waad.tba.modules.medicaltaxonomy.enterprise;

import org.junit.jupiter.api.Test;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;

public class FixMedicalServiceLengthTest {
    @Test
    public void fixLength() {
        String url = "jdbc:postgresql://localhost:5432/tba_waad_system";
        String user = "postgres";
        String password = "postgres";

        try (Connection conn = DriverManager.getConnection(url, user, password);
             Statement stmt = conn.createStatement()) {
            
            System.out.println("Increasing medical_services.code length...");
            stmt.execute("ALTER TABLE medical_services ALTER COLUMN code TYPE VARCHAR(100)");
            System.out.println("✅ Schema updated successfully for medical_services.");

        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
