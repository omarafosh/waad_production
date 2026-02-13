package com.waad.tba.util;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

/**
 * Utility class to generate BCrypt password hash
 * Run this to get the correct hash for SUPER_ADMIN password
 */
public class PasswordHashGenerator {
    
    public static void main(String[] args) {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
        String password = "Admin@123";
        String hash = encoder.encode(password);
        
        // Use logger or write to file in production
        // For development, uncomment below:
        // System.out.println("Password: " + password);
        // System.out.println("BCrypt Hash: " + hash);
    }
}
