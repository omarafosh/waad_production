package com.waad.tba.modules.member.service;


import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import com.waad.tba.common.entity.Organization;
import com.waad.tba.common.enums.OrganizationType;
import com.waad.tba.common.repository.OrganizationRepository;
import com.waad.tba.modules.benefitpolicy.repository.BenefitPolicyRepository;
import com.waad.tba.modules.member.dto.MemberCreateDto;
import com.waad.tba.modules.member.dto.MemberViewDto;
import com.waad.tba.modules.member.entity.Member;
import com.waad.tba.modules.member.repository.MemberRepository;
import com.waad.tba.modules.member.service.UnifiedMemberService;
import com.waad.tba.common.excel.service.ExcelParserService;

import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.Row;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
public class MemberExcelImportServiceTest {

    @InjectMocks
    private MemberExcelImportService importService;

    @Mock private MemberRepository memberRepository;
    @Mock private OrganizationRepository organizationRepository;
    @Mock private BenefitPolicyRepository benefitPolicyRepository;
    @Mock private UnifiedMemberService unifiedMemberService;
    @Mock private ExcelParserService parserService;
    @Mock private Row row;
    @Mock private Cell cell;

    private Organization employer;
    private final Long EMPLOYER_ID = 100L;
    private Map<String, Integer> fieldToColumnIndex;
    private Map<Integer, String> columnIndexToName;
    
    // Maps for duplicate detection
    private Map<String, Member> nationalNumberMap;
    private Map<String, Member> employeeNumberMap;
    private Map<String, Member> normalizedNameMap;

    @BeforeEach
    void setUp() {
        employer = new Organization();
        employer.setId(EMPLOYER_ID);
        employer.setName("Test Employer");

        fieldToColumnIndex = new HashMap<>();
        columnIndexToName = new HashMap<>();
        nationalNumberMap = new HashMap<>();
        employeeNumberMap = new HashMap<>();
        normalizedNameMap = new HashMap<>();
        
        // Mock Employer Lookup
        when(organizationRepository.findById(EMPLOYER_ID)).thenReturn(Optional.of(employer));
        
        // Setup column mappings (simulating parsed header)
        fieldToColumnIndex.put("fullName", 0);
        fieldToColumnIndex.put("civilId", 1);
        fieldToColumnIndex.put("employeeNumber", 2);
        fieldToColumnIndex.put("phone", 3);
        
        // Mock cell retrieval
        // We'll mock specific cell values in tests using parserService
        
        // Fix for NPE: Mock save to return the argument
        when(memberRepository.save(any(Member.class))).thenAnswer(i -> i.getArgument(0));
    }

    private void mockCellValue(int colIndex, String value) {
        when(row.getCell(colIndex)).thenReturn(cell); // Simplified: same cell mock object, different behavior depending on call order? 
        // Better: Validate logic calls parserService.getCellValueAsString(row.getCell(i))
        // So we mock row.getCell(i) -> returns a cell (can be same mock)
        // And parserService.getCellValueAsString(cell) -> returns value? 
        // This is tricky if "cell" is reused.
        // Let's mock: when(parserService.getCellValueAsString(row.getCell(colIndex))).thenReturn(value);
        // But row.getCell(colIndex) must return something non-null first.
        
        Cell mockCell = mock(Cell.class);
        when(row.getCell(colIndex)).thenReturn(mockCell);
        when(parserService.getCellValueAsString(mockCell)).thenReturn(value);
    }

    @Test
    void processRow_ShouldSkip_WhenDuplicateFoundByNationalNumber_AndPolicyIsSkip() {
        // Arrange
        String nationalId = "1234567890";
        Member existing = new Member();
        existing.setId(50L);
        existing.setCivilId(nationalId);
        existing.setFullName("Existing Member");
        
        nationalNumberMap.put(nationalId, existing);
        
        // Mock Input
        mockCellValue(0, "New Name"); // Full Name
        mockCellValue(1, nationalId); // National ID
        
        // Act
        // Reflection to access private/protected method or use the service if public (it is public now?)
        // processRow is public in the service.
        var result = importService.processRow(row, 1, fieldToColumnIndex, columnIndexToName, 
                1L, EMPLOYER_ID, null, "SKIP", 
                nationalNumberMap, employeeNumberMap, normalizedNameMap, new HashMap<>(), new HashMap<>());

        // Assert
        assertTrue(result.getClass().getName().contains("ImportRowResult"));
        // We need to check if it was skipped. ImportRowResult has isSkipped() but class is private static.
        // However, looking at the code, it returns ImportRowResult.skipped().
        // We can't access private class easily.
        // But we can verify interactions!
        
        // If skipped, save should NOT be called
        verify(memberRepository, never()).save(any());
        verify(unifiedMemberService, never()).createPrincipalMember(any());
    }

    @Test
    void processRow_ShouldUpdate_WhenDuplicateFoundByNationalNumber_AndPolicyIsUpdate() {
        // Arrange
        String nationalId = "1234567890";
        Member existing = new Member();
        existing.setId(50L);
        existing.setCivilId(nationalId);
        existing.setFullName("Old Name");
        
        nationalNumberMap.put(nationalId, existing);
        
        mockCellValue(0, "New Name");
        mockCellValue(1, nationalId);
        
        // Act
        importService.processRow(row, 1, fieldToColumnIndex, columnIndexToName, 
                1L, EMPLOYER_ID, null, "UPDATE", 
                nationalNumberMap, employeeNumberMap, normalizedNameMap, new HashMap<>(), new HashMap<>());

        // Assert
        assertEquals("New Name", existing.getFullName());
        // Should NOT create new
        verify(unifiedMemberService, never()).createPrincipalMember(any());
        // Should save existing
        verify(memberRepository).save(existing); // or we assume transaction handles it, but service calls save explicitly
    }

    @Test
    void processRow_ShouldUpdate_WhenDuplicateFoundByNormalizedName() {
        // Arrange
        String nameInDb = "احمد محمد";
        String normalizedDb = "احمد محمد"; // simplified
        
        Member existing = new Member();
        existing.setId(60L);
        existing.setFullName(nameInDb);
        
        normalizedNameMap.put(normalizedDb, existing);
        
        // Input has variations
        String inputName = "أحمد  محمد"; // with Hamza and extra space
        // Normalize: "أحمد  محمد" -> "احمد محمد"
        
        mockCellValue(0, inputName);
        mockCellValue(1, "99999"); // Different/New ID, but name matches
        
        // Act
        importService.processRow(row, 1, fieldToColumnIndex, columnIndexToName, 
                1L, EMPLOYER_ID, null, "UPDATE", 
                nationalNumberMap, employeeNumberMap, normalizedNameMap, new HashMap<>(), new HashMap<>());

        // Assert
        // Should find existing by name and update it
        assertEquals(inputName, existing.getFullName()); // Should update name to match Excel exactly? Yes logic does setter.
        verify(memberRepository).save(existing);
    }
    
    @Test
    void processRow_ShouldCreateNew_WhenNoDuplicateFound() {
        // Arrange
        mockCellValue(0, "New Unique Member");
        mockCellValue(1, "88888");
        
        MemberViewDto createdDto = new MemberViewDto();
        createdDto.setId(200L);
        
        Member newMember = new Member();
        newMember.setId(200L);
        newMember.setFullName("New Unique Member");
        
        when(unifiedMemberService.createPrincipalMember(any(MemberCreateDto.class))).thenReturn(createdDto);
        when(memberRepository.findById(200L)).thenReturn(Optional.of(newMember));
        when(memberRepository.save(any(Member.class))).thenReturn(newMember);

        // Act
        importService.processRow(row, 1, fieldToColumnIndex, columnIndexToName, 
                1L, EMPLOYER_ID, null, "UPDATE", 
                nationalNumberMap, employeeNumberMap, normalizedNameMap, new HashMap<>(), new HashMap<>());

        // Assert
        verify(unifiedMemberService).createPrincipalMember(any(MemberCreateDto.class));
    }
}
