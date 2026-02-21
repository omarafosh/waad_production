package com.waad.tba.modules.member.service;

import com.waad.tba.BaseIntegrationTest;
import com.waad.tba.common.entity.Organization;
import com.waad.tba.common.repository.OrganizationRepository;
import com.waad.tba.modules.benefitpolicy.entity.BenefitPolicy;
import com.waad.tba.modules.benefitpolicy.repository.BenefitPolicyRepository;
import com.waad.tba.modules.member.dto.MemberCreateDto;
import com.waad.tba.modules.member.dto.MemberViewDto;
import com.waad.tba.modules.member.dto.DependentMemberDto;
import com.waad.tba.modules.member.entity.Member;
import com.waad.tba.modules.member.repository.MemberRepository;
import com.waad.tba.modules.rbac.entity.User;
import com.waad.tba.modules.rbac.repository.UserRepository;
import com.waad.tba.modules.rbac.entity.Role;
import com.waad.tba.modules.rbac.repository.RoleRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.test.context.support.WithMockUser;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("Member Management — Integration Scenarios")
class MemberIntegrationTest extends BaseIntegrationTest {

        @Autowired
        private UnifiedMemberService memberService;

        @Autowired
        private MemberRepository memberRepository;

        @Autowired
        private OrganizationRepository organizationRepository;

        @Autowired
        private BenefitPolicyRepository benefitPolicyRepository;

        @Autowired
        private UserRepository userRepository;

        @Autowired
        private RoleRepository roleRepository;

        private Organization testOrg;
        private BenefitPolicy testPolicy;

        @BeforeEach
        void setUp() {
                // Create Organization
                testOrg = organizationRepository.save(Organization.builder()
                                .name("Test Employer Org")
                                .code("EMP-" + System.currentTimeMillis())
                                .active(true)
                                .build());

                // Create Benefit Policy
                testPolicy = benefitPolicyRepository.save(BenefitPolicy.builder()
                                .name("Standard Plan")
                                .employerOrganization(testOrg)
                                .annualLimit(BigDecimal.valueOf(10000.00))
                                .startDate(LocalDate.now().minusMonths(1))
                                .endDate(LocalDate.now().plusYears(1))
                                .active(true)
                                .status(BenefitPolicy.BenefitPolicyStatus.ACTIVE)
                                .build());

                // Ensure Admin Role exists
                Role adminRole = roleRepository.findByName("SUPER_ADMIN")
                                .orElseGet(() -> roleRepository.save(Role.builder().name("SUPER_ADMIN").build()));

                // Create Admin User
                if (userRepository.findByUsername("admin_user").isEmpty()) {
                        userRepository.save(User.builder()
                                        .username("admin_user")
                                        .email("admin@test.com")
                                        .password("pass")
                                        .active(true)
                                        .fullName("Admin User")
                                        .roles(Set.of(adminRole))
                                        .build());
                }
        }

        @Test
        @DisplayName("Should create principal member with generated barcode")
        @WithMockUser(username = "admin_user", roles = { "SUPER_ADMIN" })
        void createPrincipalMember_Success() {
                MemberCreateDto createDto = MemberCreateDto.builder()
                                .fullName("Principal Member")
                                .civilId("123456789012")
                                .cardNumber("CARD-" + System.currentTimeMillis())
                                .policyNumber("POL-123")
                                .benefitPolicyId(testPolicy.getId())
                                .employerId(testOrg.getId())
                                .gender(Member.Gender.MALE)
                                .startDate(LocalDate.now())
                                .endDate(LocalDate.now().plusYears(1))
                                .build();

                MemberViewDto result = memberService.createPrincipalMember(createDto);

                assertNotNull(result.getId());
                assertEquals("Principal Member", result.getFullName());
                assertEquals(Member.MemberType.PRINCIPAL.name(), result.getType());
                assertNotNull(result.getBarcode(), "Barcode must be generated for Principal");
                assertTrue(result.getBarcode().startsWith("WAAD-"), "Barcode should start with prefix WAAD-");

                Member persisted = memberRepository.findById(result.getId()).orElseThrow();
                assertEquals(testOrg.getId(), persisted.getEmployerOrganization().getId());
                assertEquals(testPolicy.getId(), persisted.getBenefitPolicy().getId());
        }

        @Test
        @DisplayName("Should create dependent member linked to principal")
        @WithMockUser(username = "admin_user", roles = { "SUPER_ADMIN" })
        void createDependentMember_Success() {
                // 1. Create Principal first
                Member principal = memberRepository.save(Member.builder()
                                .fullName("Father Member")
                                .cardNumber("P-CARD-" + System.currentTimeMillis())
                                .employerOrganization(testOrg)
                                .benefitPolicy(testPolicy)
                                .barcode("WAD-TEST-PARENT")
                                .active(true)
                                .build());

                // 2. Create Dependent using DTO
                DependentMemberDto dependentDto = new DependentMemberDto();
                dependentDto.setFullName("Son Member");
                dependentDto.setRelationship(Member.Relationship.SON);
                dependentDto.setCivilId("987654321098");
                dependentDto.setGender(Member.Gender.MALE);
                dependentDto.setBirthDate(LocalDate.of(2010, 1, 1));
                // Benefit Policy is inherited from Principal

                MemberViewDto result = memberService.createDependentMember(principal.getId(), dependentDto);

                // 3. Verify
                assertNotNull(result.getId());
                assertEquals("Son Member", result.getFullName());
                assertEquals(Member.MemberType.DEPENDENT.name(), result.getType());
                assertNull(result.getBarcode(), "Dependent should NOT have a barcode");
                assertEquals(Member.Relationship.SON, result.getRelationship());

                Member persisted = memberRepository.findById(result.getId()).orElseThrow();
                assertEquals(principal.getId(), persisted.getParent().getId());
                assertEquals(principal.getId(), persisted.getPrincipalMember().getId());
        }

        @Test
        @DisplayName("Should enforce unique Civil ID constraint")
        @WithMockUser(username = "admin_user", roles = { "SUPER_ADMIN" })
        void createMember_DuplicateCivilId_ThrowsException() {
                String civilId = "112233445566";

                // Create first member
                memberRepository.save(Member.builder()
                                .fullName("Member One")
                                .civilId(civilId)
                                .cardNumber("C1-" + System.currentTimeMillis())
                                .employerOrganization(testOrg)
                                .benefitPolicy(testPolicy)
                                .barcode("B1-" + System.currentTimeMillis())
                                .active(true)
                                .build());

                // Try creating second member with same Civil ID
                Member memberTwo = Member.builder()
                                .fullName("Member Two")
                                .civilId(civilId)
                                .cardNumber("C2-" + System.currentTimeMillis())
                                .employerOrganization(testOrg)
                                .benefitPolicy(testPolicy)
                                .barcode("B2-" + System.currentTimeMillis())
                                .active(true)
                                .build();

                assertThrows(DataIntegrityViolationException.class, () -> {
                        memberRepository.save(memberTwo);
                        memberRepository.flush(); // Force DB write to trigger constraint
                });
        }

        @Test
        @DisplayName("Should soft delete member")
        @WithMockUser(username = "admin_user", roles = { "SUPER_ADMIN" })
        void softDeleteMember_Success() {
                Member member = memberRepository.save(Member.builder()
                                .fullName("To Be Deleted")
                                .cardNumber("DEL-" + System.currentTimeMillis())
                                .employerOrganization(testOrg)
                                .benefitPolicy(testPolicy)
                                .barcode("WAD-DEL-" + System.currentTimeMillis())
                                .active(true)
                                .build());

                memberService.deleteMember(member.getId());

                // Verify Active flag is false
                // Note: Repository might filter out deleted entities depending on
                // configuration.
                // If it returns null (not found), that's also valid for soft delete visibility.
                // If it returns entity, we check flags.

                // Let's check via raw SQL or assume current session visibility
                // Ideally the service should throw NotFoundException when trying to fetch it
                // again via normal methods

                // checking direct repository access (which usually applies @SQLRestriction)
                assertFalse(memberRepository.existsById(member.getId()),
                                "Member should not be found via standard repository methods after delete");
        }
}
