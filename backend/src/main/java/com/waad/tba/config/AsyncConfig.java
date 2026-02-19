package com.waad.tba.config;

import org.springframework.aop.interceptor.AsyncUncaughtExceptionHandler;
import org.springframework.aop.interceptor.SimpleAsyncUncaughtExceptionHandler;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.scheduling.annotation.AsyncConfigurer;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.security.task.DelegatingSecurityContextAsyncTaskExecutor;

import java.util.concurrent.Executor;
import java.util.concurrent.ThreadPoolExecutor;

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ASYNC CONFIGURATION — SECURITY-AWARE THREAD POOL
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * CRITICAL FIX: Uses DelegatingSecurityContextAsyncTaskExecutor to propagate
 * Spring Security's SecurityContext (Authentication) to async threads.
 *
 * WITHOUT this fix:
 *   - @Async methods lose the SecurityContext
 *   - authorizationService.getCurrentUser() returns NULL
 *   - processApprovalAsync throws NullPointerException on currentUser.getId()
 *   - Claims stuck in APPROVAL_IN_PROGRESS or auto-rejected incorrectly
 *
 * WITH this fix:
 *   - SecurityContext is copied to each Async thread
 *   - getCurrentUser() works correctly inside @Async methods
 *   - Audit trails recorded accurately
 *
 * TWO EXECUTORS:
 *   1. taskExecutor     — General purpose async tasks (default)
 *   2. approvalTaskExecutor — Financial claim approval processing (dedicated pool)
 * ═══════════════════════════════════════════════════════════════════════════
 */
@Configuration
@EnableAsync
public class AsyncConfig implements AsyncConfigurer {

    /**
     * Default async executor — general purpose tasks.
     * Wrapped with DelegatingSecurityContextAsyncTaskExecutor to propagate SecurityContext.
     */
    @Primary
    @Override
    @Bean(name = "taskExecutor")
    public Executor getAsyncExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(5);
        executor.setMaxPoolSize(20);
        executor.setQueueCapacity(50);
        executor.setThreadNamePrefix("TBA-Async-");
        // Caller runs policy: if queue is full, caller thread executes the task (no task loss)
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());
        executor.initialize();
        // ✅ SECURITY FIX: Wrap with DelegatingSecurityContextAsyncTaskExecutor
        return new DelegatingSecurityContextAsyncTaskExecutor(executor);
    }

    /**
     * Dedicated executor for claim approval processing.
     * Separate pool to isolate financial operations from general tasks.
     * Also security-context-aware.
     *
     * Used by: @Async("approvalTaskExecutor") in ClaimService
     */
    @Bean(name = "approvalTaskExecutor")
    public Executor approvalTaskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        // Dedicated pool for financial approvals — smaller, tighter
        executor.setCorePoolSize(3);
        executor.setMaxPoolSize(10);
        executor.setQueueCapacity(25);
        executor.setThreadNamePrefix("TBA-Approval-");
        // CallerRunsPolicy: if queue full, approval runs synchronously in calling thread
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());
        executor.initialize();
        // ✅ SECURITY FIX: Propagate SecurityContext to approval threads
        return new DelegatingSecurityContextAsyncTaskExecutor(executor);
    }

    @Override
    public AsyncUncaughtExceptionHandler getAsyncUncaughtExceptionHandler() {
        return new SimpleAsyncUncaughtExceptionHandler();
    }
}
