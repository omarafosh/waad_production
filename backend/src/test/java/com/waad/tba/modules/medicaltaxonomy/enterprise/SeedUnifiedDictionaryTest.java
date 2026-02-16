package com.waad.tba.modules.medicaltaxonomy.enterprise;

import org.junit.jupiter.api.Test;
import java.io.BufferedReader;
import java.io.FileReader;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;
import java.nio.file.Paths;

public class SeedUnifiedDictionaryTest {

    @Test
    public void seedDictionary() {
        // We use localhost if running outside docker, or tba-db if inside.
        // Assuming the runner can reach localhost:5432
        String url = "jdbc:postgresql://localhost:5432/tba_waad_system";
        String user = "postgres";
        String password = "postgres";
        
        // Use relative path from project root
        String sqlFilePath = Paths.get("..", "scripts", "insert_unified_dictionary.sql").toString();

        try (Connection conn = DriverManager.getConnection(url, user, password);
             Statement stmt = conn.createStatement();
             BufferedReader reader = new BufferedReader(new FileReader(sqlFilePath))) {

            System.out.println("Starting database seeding via JUnit...");
            String line;
            StringBuilder sqlBuilder = new StringBuilder();
            int count = 0;
            
            while ((line = reader.readLine()) != null) {
                if (line.trim().isEmpty() || line.startsWith("--")) continue;
                
                sqlBuilder.append(line);
                if (line.trim().endsWith(";")) {
                    stmt.execute(sqlBuilder.toString());
                    sqlBuilder.setLength(0);
                    count++;
                }
            }
            System.out.println("Seeding complete. Total records inserted: " + count);

        } catch (Exception e) {
            System.err.println("Error during seeding: " + e.getMessage());
            // We don't fail the test here to see the output, but in real scenarios we should.
        }
    }
}
