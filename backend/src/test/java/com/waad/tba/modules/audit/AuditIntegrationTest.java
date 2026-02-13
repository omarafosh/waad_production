package com.waad.tba.modules.audit;

import com.waad.tba.modules.member.entity.Member;
import com.waad.tba.modules.member.repository.MemberRepository;
import com.waad.tba.common.audit.entity.EntityHistory;
import com.waad.tba.common.audit.repository.EntityHistoryRepository;
import com.waad.tba.common.lifecycle.service.LifecycleManagerService;
import org.junit.jupiter.api.Test;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import org.springframework.data.domain.Pageable;
import org.springframework.security.core.userdetails.User;
import com.waad.tba.common.lifecycle.dto.LifecycleContext;
import com.waad.tba.common.lifecycle.enums.LifecycleAction;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Transactional
public class AuditIntegrationTest {

    @Autowired
    private MemberRepository memberRepository;

    @Autowired
    private EntityHistoryRepository historyRepository;

    @Autowired
    private LifecycleManagerService lifecycleManager;

    @Test
    void testAuditCaptureOnEntityChange() {
        // 1. Setup Correlation ID in MDC (simulating filter)
        String correlationId = UUID.randomUUID().toString();
        MDC.put("correlationId", correlationId);

        try {
            // 2. Create a Member
            Member member = Member.builder()
                    .fullName("Test User")
                    .civilId("123456789")
                    .joinDate(LocalDate.now())
                    .active(true)
                    .build();
            member = memberRepository.save(member);

            // 3. Trigger a lifecycle action (which triggers audit)
            LifecycleContext context = LifecycleContext.builder()
                    .reason("Testing audit")
                    .currentUser(User.withUsername("USER_001").password("pass").roles("USER").build())
                    .build();

            lifecycleManager.execute("MEMBER", member.getId(), LifecycleAction.TERMINATE, context);

            // 4. Verify History Entry
            List<EntityHistory> history = historyRepository.findByEntityTypeAndEntityId("MEMBER", member.getId(), Pageable.unpaged()).getContent();
            
            assertFalse(history.isEmpty(), "Audit history should not be empty after action");
            EntityHistory latest = history.get(0);
            
            assertEquals("TERMINATE", latest.getAction());
            assertEquals(correlationId, latest.getCorrelationId(), "Correlation ID should be captured from MDC");
            assertNotNull(latest.getChangesJson(), "Changes JSON snapshot should be present");
            assertTrue(latest.getChangesJson().contains("\"new\""), "Changes JSON should contain new value");
            assertNotNull(latest.getPerformedBy(), "Performer should be captured");
            
        } finally {
            MDC.remove("correlationId");
        }
    }
}
