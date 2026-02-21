package com.waad.tba.modules.medicaltaxonomy.enterprise;

import org.junit.jupiter.api.Test;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;

public class SearchProvidersTest {

    @Test
    public void searchProviders() {
        String url = "jdbc:postgresql://localhost:5432/tba_waad_system";
        String user = "postgres";
        String password = "postgres";

        try (Connection conn = DriverManager.getConnection(url, user, password);
             Statement stmt = conn.createStatement()) {

            String[] keywords = {"فينيسيا", "دنتال", "Venice", "Dental"};
            for (String kw : keywords) {
                System.out.println("Searching for: " + kw);
                ResultSet rs = stmt.executeQuery("SELECT id, name FROM providers WHERE name LIKE '%" + kw + "%'");
                while (rs.next()) {
                    System.out.println(String.format("Found: ID: %d | Name: %s", rs.getLong("id"), rs.getString("name")));
                }
            }

        } catch (Exception e) {
            System.err.println("Search failed: " + e.getMessage());
        }
    }
}
