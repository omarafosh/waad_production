package com.waad.tba.modules.member.controller;

import com.waad.tba.common.dto.ApiResponse;
import com.waad.tba.common.excel.dto.ExcelImportResult;
import com.waad.tba.modules.member.dto.MemberCreateDto;
import com.waad.tba.modules.member.dto.MemberUpdateDto;
import com.waad.tba.modules.member.dto.MemberViewDto;
import com.waad.tba.modules.member.service.ExcelColumnMappingService;
import com.waad.tba.modules.member.service.MemberDocumentService;
import com.waad.tba.modules.member.service.MemberExcelImportService;
import com.waad.tba.modules.member.service.MemberExcelTemplateService;
import com.waad.tba.modules.member.service.MemberFinancialSummaryService;
import com.waad.tba.modules.member.service.MemberPdfExportService;
import com.waad.tba.modules.member.dto.MemberSearchCriteria;
import com.waad.tba.modules.member.service.UnifiedEligibilityService;
import com.waad.tba.modules.member.service.UnifiedMemberService;
import com.waad.tba.modules.member.service.UnifiedSearchService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockMultipartFile;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.nullable;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("UnifiedMemberController unit tests")
class UnifiedMemberControllerUnitTest {

        @Mock
        private UnifiedMemberService unifiedMemberService;
        @Mock
        private MemberFinancialSummaryService financialSummaryService;
        @Mock
        private MemberDocumentService memberDocumentService;
        @Mock
        private com.waad.tba.common.file.FileStorageService fileStorageService;
        @Mock
        private MemberPdfExportService memberPdfExportService;

        @Mock
        private MemberExcelTemplateService memberExcelTemplateService;
        @Mock
        private MemberExcelImportService memberExcelImportService;
        @Mock
        private ExcelColumnMappingService excelColumnMappingService;
        @Mock
        private UnifiedEligibilityService eligibilityService;
        @Mock
        private UnifiedSearchService unifiedSearchService;
        @Mock
        private com.waad.tba.security.AuthorizationService authorizationService;

        private UnifiedMemberController unifiedMemberController;
        private MemberExcelTemplateController memberExcelTemplateController;

        @BeforeEach
        void setUp() {
                unifiedMemberController = new UnifiedMemberController(
                                unifiedMemberService,
                                financialSummaryService,
                                memberDocumentService,
                                fileStorageService,
                                memberPdfExportService,
                                eligibilityService,
                                unifiedSearchService);

                memberExcelTemplateController = new MemberExcelTemplateController(
                                memberExcelTemplateService,
                                memberExcelImportService,
                                excelColumnMappingService,
                                authorizationService);
        }

        @Test
        @DisplayName("createMember returns 201 and payload")
        void createMember_returnsCreated() {
                MemberCreateDto createDto = new MemberCreateDto();
                MemberViewDto created = new MemberViewDto();
                created.setId(101L);

                when(unifiedMemberService.createPrincipalMember(createDto)).thenReturn(created);

                ResponseEntity<ApiResponse<MemberViewDto>> response = unifiedMemberController.createMember(createDto);

                assertEquals(HttpStatus.CREATED, response.getStatusCode());
                assertNotNull(response.getBody());
                assertEquals(created, response.getBody().getData());
                verify(unifiedMemberService).createPrincipalMember(createDto);
        }

        @Test
        @DisplayName("updateMember returns 200 and updated member")
        void updateMember_returnsOk() {
                Long memberId = 55L;
                MemberUpdateDto updateDto = new MemberUpdateDto();
                MemberViewDto updated = new MemberViewDto();
                updated.setId(memberId);

                when(unifiedMemberService.updateMember(memberId, updateDto)).thenReturn(updated);

                ResponseEntity<MemberViewDto> response = unifiedMemberController.updateMember(memberId, updateDto);

                assertEquals(HttpStatus.OK, response.getStatusCode());
                assertEquals(updated, response.getBody());
                verify(unifiedMemberService).updateMember(memberId, updateDto);
        }

        @Test
        @DisplayName("deleteMember returns 204")
        void deleteMember_returnsNoContent() {
                Long memberId = 66L;

                ResponseEntity<Void> response = unifiedMemberController.deleteMember(memberId);

                assertEquals(HttpStatus.NO_CONTENT, response.getStatusCode());
                verify(unifiedMemberService).deleteMember(memberId);
        }

        @Test
        @DisplayName("searchMembers uses MemberSearchCriteria")
        void searchMembers_usesSearchCriteria() {
                Page<MemberViewDto> page = new PageImpl<>(List.of(new MemberViewDto()));
                when(unifiedMemberService.searchMembersAdvanced(any(MemberSearchCriteria.class), any()))
                                .thenReturn(page);

                ResponseEntity<ApiResponse<Page<MemberViewDto>>> response = unifiedMemberController.searchMembers(
                                "Ahmed", null, null, null, null, null,
                                null, 1L, 2L, "ACTIVE", "PRINCIPAL", false, 0, 20);

                ArgumentCaptor<MemberSearchCriteria> criteriaCaptor = ArgumentCaptor
                                .forClass(MemberSearchCriteria.class);
                verify(unifiedMemberService).searchMembersAdvanced(criteriaCaptor.capture(), any());

                assertEquals("Ahmed", criteriaCaptor.getValue().getFullName());
                assertEquals(1L, criteriaCaptor.getValue().getOrganizationId());
                assertEquals(HttpStatus.OK, response.getStatusCode());
                assertEquals(page, response.getBody().getData());
        }

        @Test
        @DisplayName("importMembers returns 200 on successful import")
        void importMembers_returnsOkWhenSuccess() {
                ExcelImportResult result = ExcelImportResult.builder()
                                .success(true)
                                .messageEn("Imported successfully")
                                .build();
                MockMultipartFile file = new MockMultipartFile(
                                "file", "members.xlsx",
                                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                                new byte[] { 1, 2 });

                when(memberExcelTemplateService.importFromExcel(file)).thenReturn(result);

                ResponseEntity<ApiResponse<ExcelImportResult>> response = memberExcelTemplateController
                                .importMembers(file);

                assertEquals(HttpStatus.OK, response.getStatusCode());
                assertEquals(result, response.getBody().getData());
                verify(memberExcelTemplateService).importFromExcel(file);
        }

        when(unifiedMemberService.exportMembersToExcel(any(MemberSearchCriteria.class)))
                .thenReturn(excel);

        ResponseEntity<byte[]> response = unifiedMemberController.exportMembersExcel(
                "name", null, null, null, null, null, null, 1L, 2L,
                "ACTIVE", "PRINCIPAL", false);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertArrayEquals(excel, response.getBody());
        
        ArgumentCaptor<MemberSearchCriteria> criteriaCaptor = ArgumentCaptor.forClass(MemberSearchCriteria.class);
        verify(unifiedMemberService).exportMembersToExcel(criteriaCaptor.capture());
        assertEquals("name", criteriaCaptor.getValue().getFullName());
        assertEquals(1L, criteriaCaptor.getValue().getOrganizationId());
    }
}
