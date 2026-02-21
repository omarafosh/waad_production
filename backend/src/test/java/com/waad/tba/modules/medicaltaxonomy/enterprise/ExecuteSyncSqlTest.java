package com.waad.tba.modules.medicaltaxonomy.enterprise;

import org.junit.jupiter.api.Test;
import java.io.BufferedReader;
import java.io.FileReader;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;

public class ExecuteSyncSqlTest {
    @Test
    public void executeSync() {
        String url = "jdbc:postgresql://localhost:5432/tba_waad_system";
        String user = "postgres";
        String password = "postgres";

        try (Connection conn = DriverManager.getConnection(url, user, password);
             Statement stmt = conn.createStatement()) {
            
            conn.setAutoCommit(false);
            
            BufferedReader reader = new BufferedReader(new FileReader("sync_ui_data.sql"));
            String line;
            StringBuilder sqlBatch = new StringBuilder();
            int count = 0;

            while ((line = reader.readLine()) != null) {
                if (line.trim().isEmpty() || line.startsWith("--") || line.equals("BEGIN;") || line.equals("COMMIT;")) continue;
                
                sqlBatch.append(line).append(" ");
                if (line.trim().endsWith(";")) {
                    stmt.addBatch(sqlBatch.toString());
                    sqlBatch.setLength(0);
                    count++;
                    
                    if (count % 100 == 0) {
                        stmt.executeBatch();
                        System.out.println("Executed " + count + " statements...");
                    }
                }
            }
            
            stmt.executeBatch();
            conn.commit();
            System.out.println("✅ Sync completed successfully: " + count + " statements.");

        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
