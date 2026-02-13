package com.waad.tba.modules.admin.system;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.waad.tba.common.dto.ApiResponse;
import com.waad.tba.modules.claim.repository.ClaimRepository;
import com.waad.tba.modules.company.repository.CompanyRepository;
import com.waad.tba.common.repository.OrganizationRepository;
import com.waad.tba.modules.member.repository.MemberRepository;
import com.waad.tba.modules.rbac.repository.PermissionRepository;
import com.waad.tba.modules.rbac.repository.RoleRepository;
import com.waad.tba.modules.rbac.repository.UserRepository;
import com.waad.tba.modules.reviewer.repository.ReviewerCompanyRepository;
import com.waad.tba.modules.visit.repository.VisitRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class SystemAdminService {

    private final ClaimRepository claimRepository;
    private final VisitRepository visitRepository;
    private final MemberRepository memberRepository;
    private final OrganizationRepository organizationRepository;
    private final ReviewerCompanyRepository reviewerCompanyRepository;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;
    private final CompanyRepository companyRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public ApiResponse<Void> resetTestData() {
        log.warn("Resetting test data (excluding RBAC tables)...");
        claimRepository.deleteAll();
        visitRepository.deleteAll();
        memberRepository.deleteAll();
        organizationRepository.deleteAll();
        reviewerCompanyRepository.deleteAll();
        log.info("Test data cleared.");
        return ApiResponse.success("Test data cleared", null);
    }

    @Transactional
    public ApiResponse<Void> initDefaults() {
        log.info("Initializing default system data...");
        ensurePrimaryTenantCompany();
        // RBAC initialization moved to RbacDataInitializer
        return ApiResponse.success("Defaults initialized", null);
    }

    /**
     * Ensure the primary tenant company (Waad) exists in the system.
     * 
     * @deprecated This method writes to legacy Company entity.
     *             The Waad TPA organization should be created via V003 Flyway migration.
     *             Disabled to enforce Organization-only writes.
     */
    @Deprecated
    private void ensurePrimaryTenantCompany() {
        log.info("ensurePrimaryTenantCompany() is DISABLED - TPA organization created via Flyway V003 migration");
        
        // NOTE: The Waad TPA organization is now created in:
        // backend/src/main/resources/db/migration/V003__backfill_organizations.sql
        // 
        // If you need to manually create it, use:
        // INSERT INTO organizations (name, name_en, code, type, active) 
        // VALUES ('وعد لإدارة النفقات الطبية', 'Waad TPA', 'WAAD-TPA', 'TPA', true);
        
        // Legacy code disabled:
        // Company waadCompany = Company.builder()...
        // companyRepository.save(waadCompany); ❌ PROHIBITED
    }

    @Transactional
    public ApiResponse<Void> seedSampleData() {
        log.warn("seedSampleData() is temporarily disabled during Organization migration");
        log.warn("Reason: Member and Claim entities still have FK relationships to legacy Employer/InsuranceCompany tables");
        log.warn("TODO: Re-enable after Member.employer_id and Claim.insurance_company_id are migrated to reference organizations table");
        
        return ApiResponse.success("Seed data temporarily disabled during migration", null);
    }

    // RBAC initialization methods removed - now handled by RbacDataInitializer
}
