package com.waad.tba.modules.medicaltaxonomy.enterprise;

import java.io.BufferedReader;
import java.io.FileReader;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;

public class SeedUnifiedDictionary {
    public static void main(String[] args) {
        String url = "jdbc:postgresql://localhost:5432/tba_waad_system";
        String user = "postgres";
        String password = "postgres";
        String sqlFilePath = "scripts/insert_unified_dictionary.sql";

        try (Connection conn = DriverManager.getConnection(url, user, password);
             Statement stmt = conn.createStatement();
             BufferedReader reader = new BufferedReader(new FileReader(sqlFilePath))) {

            System.out.println("Starting database seeding...");
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
                    if (count % 500 == 0) {
                        System.out.println("Processed " + count + " records...");
                    }
                }
            }
            System.out.println("Seeding complete. Total records: " + count);

        } catch (Exception e) {
            System.err.println("Error during seeding: " + e.getMessage());
            e.printStackTrace();
        }
    }
}
