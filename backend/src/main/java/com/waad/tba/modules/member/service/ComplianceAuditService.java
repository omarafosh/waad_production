package com.waad.tba.modules.member.service;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class ComplianceAuditService {

    @PersistenceContext
    private EntityManager entityManager;

    /**
     * Requirement 9: Network Compliance Report
     */
    @Transactional(readOnly = true)
    public Map<String, Object> getNetworkComplianceStats() {
        String query = "SELECT " +
                       "  (SELECT COUNT(*) FROM providers) as total_providers, " +
                       "  (SELECT COUNT(*) FROM provider_insurance_partnerships WHERE active = TRUE) as active_partnerships, " +
                       "  (SELECT COUNT(DISTINCT insurance_org_id) FROM provider_insurance_partnerships WHERE active = TRUE) as covered_insurance_companies";
        
        Object[] results = (Object[]) entityManager.createNativeQuery(query).getSingleResult();
        
        Map<String, Object> stats = new HashMap<>();
        stats.put("totalProviders", results[0]);
        stats.put("activePartnerships", results[1]);
        stats.put("coveredInsuranceCompanies", results[2]);
        
        return stats;
    }

    /**
     * Requirement 3 & 8: Financial Control Summary
     */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getPlanUtilizationReport() {
        String query = "SELECT bp.name, bp.policy_code, bp.annual_limit, " +
                       "COALESCE(SUM(c.approved_amount), 0) as total_spent, " +
                       "COUNT(DISTINCT m.id) as insured_count " +
                       "FROM benefit_policies bp " +
                       "LEFT JOIN members m ON bp.id = m.benefit_policy_id " +
                       "LEFT JOIN claims c ON m.id = c.member_id AND c.status = 'APPROVED' " +
                       "GROUP BY bp.id, bp.name, bp.policy_code, bp.annual_limit";
        
        List<Object[]> results = entityManager.createNativeQuery(query).getResultList();
        
        return results.stream().map(row -> {
            Map<String, Object> map = new HashMap<>();
            map.put("planName", row[0]);
            map.put("policyCode", row[1]);
            map.put("limit", row[2]);
            map.put("totalSpent", row[3]);
            map.put("insuredCount", row[4]);
            return map;
        }).toList();
    }

    /**
     * Audit of member status transitions (Daily Compliance)
     */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getRecentStatusTransitions(int limit) {
        String query = "SELECT m.full_name, h.from_status, h.to_status, h.changed_at, h.changed_by, h.reason " +
                       "FROM member_workflow_history h " +
                       "JOIN members m ON h.member_id = m.id " +
                       "ORDER BY h.changed_at DESC LIMIT :limit";
        
        List<Object[]> results = entityManager.createNativeQuery(query)
                .setParameter("limit", limit)
                .getResultList();
        
        return results.stream().map(row -> {
            Map<String, Object> map = new HashMap<>();
            map.put("member", row[0]);
            map.put("from", row[1]);
            map.put("to", row[2]);
            map.put("date", row[3]);
            map.put("user", row[4]);
            map.put("reason", row[5]);
            return map;
        }).toList();
    }
}
