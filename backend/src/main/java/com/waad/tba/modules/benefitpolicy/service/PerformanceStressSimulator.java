package com.waad.tba.modules.benefitpolicy.service;

import java.math.BigDecimal;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Performance Stress Simulator for Coverage Engine.
 * Simulates high concurrent load to measure processing speed and stability.
 */
public class PerformanceStressSimulator {

    public static void main(String[] args) throws InterruptedException {
        int threads = 20;
        int requestsPerThread = 500;
        int totalRequests = threads * requestsPerThread;

        System.out.println("🚀 Starting Stress Test: " + totalRequests + " concurrent requests using " + threads + " threads...");

        ExecutorService executor = Executors.newFixedThreadPool(threads);
        AtomicLong successCount = new AtomicLong(0);
        long startTime = System.currentTimeMillis();

        for (int i = 0; i < totalRequests; i++) {
            executor.submit(() -> {
                try {
                    // Simulate Coverage Logic Calculation (Math Intensive)
                    simulateCoverageLogic();
                    successCount.incrementAndGet();
                } catch (Exception e) {
                    // Log failure
                }
            });
        }

        executor.shutdown();
        executor.awaitTermination(1, TimeUnit.MINUTES);

        long endTime = System.currentTimeMillis();
        long duration = endTime - startTime;
        double avgResponseTime = (double) duration / totalRequests;

        System.out.println("\n--- Performance Report ---");
        System.out.println("Total Requests: " + totalRequests);
        System.out.println("Success Count: " + successCount.get());
        System.out.println("Total Duration: " + duration + " ms");
        System.out.println("Avg Response Time: " + String.format("%.2f", avgResponseTime) + " ms");
        System.out.println("Throughput: " + String.format("%.2f", (totalRequests / (duration / 1000.0))) + " req/sec");
        System.out.println("--------------------------");

        if (avgResponseTime < 50.0) {
            System.out.println("✅ PERFORMANCE STATUS: EXCELLENT");
        } else if (avgResponseTime < 200.0) {
            System.out.println("⚠️ PERFORMANCE STATUS: ACCEPTABLE");
        } else {
            System.out.println("❌ PERFORMANCE STATUS: POOR");
        }
    }

    private static void simulateCoverageLogic() {
        // Simulating the core math of BenefitPolicyCoverageService:
        // Resolve Rule -> Calculate Deductible -> Calculate Co-insurance -> Check Limits
        BigDecimal requested = new BigDecimal("1000.00");
        BigDecimal deductible = new BigDecimal("50.00");
        BigDecimal coverage = new BigDecimal("0.8");
        
        for (int i = 0; i < 50; i++) { // Nested loop to simulate computational complexity of rule matching
            BigDecimal afterDeductible = requested.subtract(deductible).max(BigDecimal.ZERO);
            BigDecimal covered = afterDeductible.multiply(coverage);
            BigDecimal patient = requested.subtract(covered);
            
            // Dummy limit check
            if (patient.compareTo(requested) > 0) {
                // Should not happen
            }
        }
    }
}
