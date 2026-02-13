package com.waad.tba.common.specification;

import org.springframework.data.jpa.domain.Specification;
import jakarta.persistence.criteria.*;

/**
 * EmployerFilterSpecification
 * 
 * Purpose: Unified employer filtering for all employer-scoped entities.
 * Security: Server-side enforcement - prevents data leakage between employers.
 * 
 * Architecture Pattern:
 * - Single Source of Truth for employer filtering
 * - Works with any entity (direct or nested employer relationship)
 * - Replaces scattered WHERE clauses across the codebase
 * 
 * Usage Examples:
 * 
 * 1. Direct Relationship (Member):
 *    spec.and(EmployerFilterSpecification.byEmployer(employerId, "employerOrganization.id"))
 * 
 * 2. Nested Relationship (Claim):
 *    spec.and(EmployerFilterSpecification.byEmployer(employerId, "member.employerOrganization.id"))
 * 
 * 3. Deep Nested (Visit):
 *    spec.and(EmployerFilterSpecification.byEmployer(employerId, "member.employerOrganization.id"))
 * 
 * Benefits:
 * - ✅ Consistent filtering logic
 * - ✅ Type-safe (compile-time checking)
 * - ✅ Testable (isolated logic)
 * - ✅ Security by default
 * - ✅ No code duplication
 * 
 * @see com.waad.tba.common.entity.EmployerScoped
 */
public class EmployerFilterSpecification {

    /**
     * Private constructor - utility class
     */
    private EmployerFilterSpecification() {
        throw new UnsupportedOperationException("Utility class");
    }

    /**
     * Create a Specification that filters by employer ID.
     * 
     * @param <T> Entity type
     * @param employerId Employer organization ID to filter by (null = no filter)
     * @param path Property path to employer ID (e.g., "employerOrganization.id", "member.employerOrganization.id")
     * @return Specification for employer filtering
     * 
     * Example:
     * <pre>
     * // For Member entity (direct relationship)
     * Specification&lt;Member&gt; spec = Specification.where(null);
     * spec = spec.and(EmployerFilterSpecification.byEmployer(employerId, "employerOrganization.id"));
     * 
     * // For Claim entity (via member)
     * Specification&lt;Claim&gt; spec = Specification.where(null);
     * spec = spec.and(EmployerFilterSpecification.byEmployer(employerId, "member.employerOrganization.id"));
     * </pre>
     */
    public static <T> Specification<T> byEmployer(Long employerId, String path) {
        return (root, query, criteriaBuilder) -> {
            // If employerId is null, don't filter (admin sees all)
            if (employerId == null) {
                return criteriaBuilder.conjunction(); // Always true
            }

            // Navigate the path and build the equal predicate
            return criteriaBuilder.equal(getPath(root, path), employerId);
        };
    }

    /**
     * Navigate a property path (supports nested properties).
     * 
     * @param <T> Root entity type
     * @param root JPA Root
     * @param path Property path (e.g., "member.employerOrganization.id")
     * @return Path to the property
     */
    private static <T> Path<Long> getPath(Root<T> root, String path) {
        String[] parts = path.split("\\.");
        Path<?> current = root;
        
        for (String part : parts) {
            current = current.get(part);
        }
        
        @SuppressWarnings("unchecked")
        Path<Long> result = (Path<Long>) current;
        return result;
    }

    /**
     * Create a Specification that filters by employer ID with JOIN (for better performance).
     * 
     * @param <T> Entity type
     * @param employerId Employer organization ID to filter by (null = no filter)
     * @param joinPath Path to join (e.g., "member", "member.employerOrganization")
     * @param targetField Final field to compare (e.g., "id")
     * @return Specification for employer filtering with JOIN
     * 
     * Example:
     * <pre>
     * // For Claim entity with explicit JOIN
     * Specification&lt;Claim&gt; spec = Specification.where(null);
     * spec = spec.and(EmployerFilterSpecification.byEmployerWithJoin(
     *     employerId, 
     *     "member.employerOrganization", 
     *     "id"
     * ));
     * </pre>
     */
    public static <T> Specification<T> byEmployerWithJoin(Long employerId, String joinPath, String targetField) {
        return (root, query, criteriaBuilder) -> {
            if (employerId == null) {
                return criteriaBuilder.conjunction();
            }

            // Build JOIN path
            String[] parts = joinPath.split("\\.");
            Join<?, ?> join = null;
            
            for (String part : parts) {
                if (join == null) {
                    join = root.join(part, JoinType.INNER);
                } else {
                    join = join.join(part, JoinType.INNER);
                }
            }

            // Null check for join before using
            if (join == null) {
                throw new IllegalStateException("JOIN path resulted in null: " + joinPath);
            }

            return criteriaBuilder.equal(join.get(targetField), employerId);
        };
    }
}
