package com.waad.tba.modules.medicaltaxonomy.enterprise;

import org.junit.jupiter.api.Test;
import java.io.BufferedReader;
import java.io.FileReader;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;

public class ExecuteBindSqlTest {

    @Test
    public void executeMappingSql() throws Exception {
        String url = "jdbc:postgresql://localhost:5432/tba_waad_system";
        String user = "postgres";
        String password = "postgres"; 
        String sqlFilePath = "d:/Backend/waadTbaSystem2026-main_final/waadTbaSystem2026-main/scripts/bind_provider_services.sql";

        try (Connection conn = DriverManager.getConnection(url, user, password);
             Statement stmt = conn.createStatement();
             BufferedReader reader = new BufferedReader(new FileReader(sqlFilePath))) {
            
            conn.setAutoCommit(false);
            String line;
            StringBuilder sqlBatch = new StringBuilder();
            int count = 0;
            
            System.out.println("Starting SQL execution...");
            
            while ((line = reader.readLine()) != null) {
                if (line.trim().isEmpty() || line.startsWith("--")) continue;
                
                sqlBatch.append(line).append(" ");
                if (line.trim().endsWith(";")) {
                    stmt.addBatch(sqlBatch.toString());
                    sqlBatch.setLength(0);
                    count++;
                    
                    if (count % 500 == 0) {
                        stmt.executeBatch();
                        conn.commit();
                        System.out.println("Executed " + count + " statements...");
                    }
                }
            }
            
            if (sqlBatch.length() > 0) {
                stmt.addBatch(sqlBatch.toString());
            }
            stmt.executeBatch();
            conn.commit();
            System.out.println("Finished! Total statements executed: " + count);
            
        } catch (Exception e) {
            e.printStackTrace();
            throw e;
        }
    }
}
