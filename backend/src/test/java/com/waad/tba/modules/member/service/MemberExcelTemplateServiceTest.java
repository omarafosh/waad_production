package com.waad.tba.modules.member.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

import java.io.IOException;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.waad.tba.common.excel.dto.ExcelImportResult;
import com.waad.tba.common.excel.service.ExcelParserService;
import com.waad.tba.common.excel.service.ExcelTemplateService;
import com.waad.tba.common.repository.OrganizationRepository;
import com.waad.tba.modules.member.repository.MemberRepository;
import org.springframework.web.multipart.MultipartFile;

@ExtendWith(MockitoExtension.class)
@DisplayName("Member Excel Template Service Tests")
public class MemberExcelTemplateServiceTest {

    @Mock
    private ExcelTemplateService templateService;
    @Mock
    private ExcelParserService parserService;
    @Mock
    private MemberRepository memberRepository;
    @Mock
    private OrganizationRepository organizationRepository;

    @InjectMocks
    private MemberExcelTemplateService service;

    @Mock
    private MultipartFile mockFile;
    @Mock
    private Workbook mockWorkbook;
    @Mock
    private Sheet mockSheet;
    @Mock
    private Row mockHeaderRow;

    @BeforeEach
    void setUp() throws IOException {
        // Common steps if needed
    }

    @Test
    @DisplayName("Import Fails on Missing Headers (Strict validation)")
    void testImport_MissingHeaders() throws IOException {
        // Arrange
        when(parserService.openWorkbook(any(MultipartFile.class))).thenReturn(mockWorkbook);
        when(parserService.getDataSheet(mockWorkbook)).thenReturn(mockSheet);
        when(mockSheet.getRow(0)).thenReturn(mockHeaderRow);
        
        // Use any() for the varargs argument to correctly match the call
        lenient().when(parserService.findColumnIndex(any(), any())).thenReturn(null);

        // Act
        ExcelImportResult result = service.importFromExcel(mockFile);

        // Assert
        assertNotNull(result);
        assertFalse(result.isSuccess());
        
        // Check top-level message matches what the service returns
        assertTrue(result.getMessageEn().contains("Mandatory columns missing") || 
                   result.getMessageEn().contains("Template validation failed"));
                   
        // Check specifics in the error list
        assertFalse(result.getErrors().isEmpty());
        String specificError = result.getErrors().get(0).getMessageEn();
        assertTrue(specificError.contains("Mandatory columns") || specificError.contains("Missing"));
    }
}
