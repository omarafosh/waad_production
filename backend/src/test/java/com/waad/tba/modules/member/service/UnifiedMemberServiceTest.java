package com.waad.tba.modules.member.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.context.ActiveProfiles;

import com.waad.tba.common.entity.Organization;
import com.waad.tba.common.exception.BusinessRuleException;
import com.waad.tba.common.exception.ResourceNotFoundException;
import com.waad.tba.common.repository.OrganizationRepository;
import com.waad.tba.modules.benefitpolicy.repository.BenefitPolicyRepository;
import com.waad.tba.modules.member.dto.DependentMemberDto;
import com.waad.tba.modules.member.dto.MemberCreateDto;
import com.waad.tba.modules.member.dto.MemberViewDto;
import com.waad.tba.modules.member.entity.Member;
import com.waad.tba.modules.member.entity.Member.Gender;
import com.waad.tba.modules.member.entity.Member.MemberType;
import com.waad.tba.modules.member.entity.Member.Relationship;
import com.waad.tba.modules.member.mapper.UnifiedMemberMapper;
import com.waad.tba.modules.member.repository.MemberRepository;

@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
@DisplayName("Unified Member Service Tests")
public class UnifiedMemberServiceTest {

    @Mock
    private MemberRepository memberRepository;
    @Mock
    private OrganizationRepository organizationRepository;
    @Mock
    private BenefitPolicyRepository benefitPolicyRepository;
    @Mock
    private BarcodeGeneratorService barcodeGenerator;
    @Mock
    private CardNumberGeneratorService cardNumberGenerator;
    @Mock
    private UnifiedMemberMapper mapper;
    @Mock
    private com.waad.tba.modules.member.repository.MemberWorkflowHistoryRepository workflowHistoryRepository;
    @Mock
    private com.waad.tba.security.AuthorizationService authorizationService;

    // Removed @InjectMocks to prevent partial injection issues
    private UnifiedMemberService unifiedMemberService;

    private MemberCreateDto validPrincipalDto;
    private Organization mockEmployer;
    private Member mockPrincipal;
    private MemberViewDto mockPrincipalView;

    @BeforeEach
    void setUp() {
        // Manual injection to ensure all dependencies including authorizationService are correctly set
        unifiedMemberService = new UnifiedMemberService(
            memberRepository,
            workflowHistoryRepository,
            organizationRepository,
            benefitPolicyRepository,
            barcodeGenerator,
            cardNumberGenerator,
            mapper,
            authorizationService
        );

        mockEmployer = Organization.builder().id(1L).name("Test Corp").build();
        
        validPrincipalDto = MemberCreateDto.builder()
                .fullName("John Doe")
                .employerId(1L)
                .gender(Gender.MALE)
                .birthDate(LocalDate.of(1980, 1, 1))
                .build();

        mockPrincipal = Member.builder()
                .id(100L)
                .fullName("John Doe")
                .gender(Gender.MALE)
                .employerOrganization(mockEmployer)
                .barcode("WAHA-2026-0001")
                .cardNumber("123456")
                .build();
    }

    @Test
    @Order(1)
    @DisplayName("Create Principal Member - Success")
    void testCreatePrincipalMember_Success() {
        // Arrange
        when(organizationRepository.findById(1L)).thenReturn(Optional.of(mockEmployer));
        when(barcodeGenerator.generateUniqueBarcodeForPrincipal()).thenReturn("WAHA-2026-0001");
        when(cardNumberGenerator.generateSmartCardNumber(any(Member.class))).thenReturn("123456");
        when(mapper.toEntity(any(MemberCreateDto.class))).thenReturn(mockPrincipal);
        when(memberRepository.save(any(Member.class))).thenReturn(mockPrincipal);
        when(mapper.toViewDto(any(Member.class), any())).thenReturn(MemberViewDto.builder().id(100L).barcode("WAHA-2026-0001").build());

        // Act
        MemberViewDto result = unifiedMemberService.createPrincipalMember(validPrincipalDto);

        // Assert
        assertNotNull(result);
        assertEquals("WAHA-2026-0001", result.getBarcode());
        verify(memberRepository).save(any(Member.class));
    }

    @Test
    @Order(2)
    @DisplayName("Create Principal with Invalid Employer - Fail")
    void testCreatePrincipal_InvalidEmployer() {
        // Arrange
        when(organizationRepository.findById(1L)).thenReturn(Optional.empty());

        // Act & Assert
        assertThrows(ResourceNotFoundException.class, () -> {
            unifiedMemberService.createPrincipalMember(validPrincipalDto);
        });
    }

    @Test
    @Order(3)
    @DisplayName("Create Principal with Dependent - Fail (ParentId not null)")
    void testCreatePrincipal_WithParentId_Fail() {
        // Arrange
        validPrincipalDto.setParentId(999L);

        // Act & Assert
        Exception exception = assertThrows(BusinessRuleException.class, () -> {
            unifiedMemberService.createPrincipalMember(validPrincipalDto);
        });
        assertEquals("Cannot create principal member with parentId.", exception.getMessage());
    }
}
