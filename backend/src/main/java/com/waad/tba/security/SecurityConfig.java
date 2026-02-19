package com.waad.tba.security;

import org.springframework.http.HttpMethod;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;
import org.springframework.beans.factory.annotation.Value;

import java.util.Arrays;
import java.util.List;

/**
 * Security Configuration for the TBA-WAAD system.
 * 
 * Note: @EnableMethodSecurity is configured in MethodSecurityConfig
 * along with the SUPER_ADMIN bypass expression handler.
 * 
 * Note: PasswordEncoder is defined in PasswordEncoderConfig to break
 * circular dependency chain.
 */
@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final UserDetailsService userDetailsService;
    private final PasswordEncoder passwordEncoder; // Injected from PasswordEncoderConfig

    @Value("${app.frontend.cors.allowed-origins}")
    private List<String> allowedOrigins;

    @Bean
    SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                // ENTERPRISE FIX: Disable CSRF for REST API (2026-02-02)
                // Rest API is protected by CORS and Authority checks.
                .csrf(AbstractHttpConfigurer::disable)

                // CORS configuration with credentials support (required for session cookies)
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))

                // Authorization rules
                .authorizeHttpRequests(auth -> auth
                        // Public endpoints - Authentication & Branding
                        .requestMatchers("/api/auth/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/settings").permitAll()
                        .requestMatchers("/actuator/health", "/actuator/health/**").permitAll()
                        // ✅ SECURITY FIX: Protect sensitive actuator endpoints (metrics, prometheus, beans, etc.)
                        // Only ADMIN roles can access monitoring endpoints
                        .requestMatchers("/actuator/**").hasAnyRole("SUPER_ADMIN", "INSURANCE_ADMIN")
                        // Diagnostic Endpoint REMOVED for Security

                        // Swagger / OpenAPI endpoints
                        .requestMatchers(
                                "/v3/api-docs/**",
                                "/swagger-ui/**",
                                "/swagger-ui.html",
                                "/swagger-resources/**",
                                "/webjars/**",
                                "/error")
                        .permitAll()
                        // All other endpoints require authentication
                        .anyRequest().authenticated())

                // Session management configuration
                .sessionManagement(session -> session
                        // Phase 2: Security Hardening (Stateless JWT)
                        // Enforce stateless sessions - no HttpSession created
                        .sessionCreationPolicy(SessionCreationPolicy.STATELESS))

                .authenticationProvider(authenticationProvider())

                // Phase 2: Filter Chain Order
                // Only JwtAuthenticationFilter is needed
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)

                // 🛡️ SECURITY HEADERS & HTTPS
                .headers(headers -> headers
                        .xssProtection(xss -> xss.disable()) // Modern browsers ignore this, CSP is better
                        .contentSecurityPolicy(csp -> csp.policyDirectives(
                                "default-src 'self'; script-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'self';"))
                        .frameOptions(frame -> frame.deny()) // Prevent Clickjacking
                        .httpStrictTransportSecurity(hsts -> hsts
                                .includeSubDomains(true)
                                .maxAgeInSeconds(31536000) // 1 year
                                .preload(true)));

        // Force HTTPS in Production (handled by Nginx/LoadBalancer usually, but good
        // practice)
        // http.requiresChannel(channel -> channel.anyRequest().requiresSecure());

        return http.build();
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        // Allow all common frontend development ports
        configuration.setAllowedOrigins(allowedOrigins);
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList(
            "Authorization", 
            "Content-Type", 
            "Accept", 
            "Origin", 
            "X-Requested-With", 
            "X-Employer-ID", 
            "X-XSRF-TOKEN"
        ));
        // AUDIT FIX: Expose CSRF token cookie to frontend
        configuration.setExposedHeaders(Arrays.asList("Authorization", "X-Employer-ID", "X-XSRF-TOKEN"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider(passwordEncoder);
        authProvider.setUserDetailsService(userDetailsService);
        return authProvider;
    }

    @Bean
    AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }
}
