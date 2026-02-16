package com.waad.tba.modules.medicaltaxonomy.enterprise;

import org.junit.jupiter.api.Test;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;

public class ListProvidersTest {

    @Test
    public void listProviders() {
        String url = "jdbc:postgresql://localhost:5432/tba_waad_system";
        String user = "postgres";
        String password = "postgres";

        try (Connection conn = DriverManager.getConnection(url, user, password);
             Statement stmt = conn.createStatement()) {

            System.out.println("--- Current Providers ---");
            ResultSet rs = stmt.executeQuery("SELECT id, name, license_number FROM providers");
            while (rs.next()) {
                System.out.println(String.format("ID: %d | Name: %s | License: %s",
                                   rs.getLong("id"), rs.getString("name"), rs.getString("license_number")));
            }

        } catch (Exception e) {
            System.err.println("Failed to list providers: " + e.getMessage());
        }
    }
}
