package com.waad.tba.modules.test;

import com.waad.tba.core.email.EmailService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/test")
@RequiredArgsConstructor
@Tag(name = "Test Utilities", description = "APIs for testing application features like email")
public class TestEmailController {

    private final EmailService emailService;

    @GetMapping("/email")
    @Operation(summary = "Send test email", description = "Sends a test email to verify SMTP configuration.")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Email sent successfully"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "Invalid email address"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "500", description = "Failed to send email")
    })
    public ResponseEntity<String> sendTestEmail(
            @Parameter(name = "to", description = "Recipient email address", required = true)
            @RequestParam String to) {
        try {
            emailService.send(to, "Test Email from TBA-WAAD", 
                """
                This is a test email from TBA-WAAD system.
                
                If you received this, SMTP configuration is working correctly!
                
                Best regards,
                TBA-WAAD Team""");
            return ResponseEntity.ok("✅ Email sent successfully to: " + to);
        } catch (Exception e) {
            return ResponseEntity.status(500).body("❌ Failed to send email: " + e.getMessage());
        }
    }
}
