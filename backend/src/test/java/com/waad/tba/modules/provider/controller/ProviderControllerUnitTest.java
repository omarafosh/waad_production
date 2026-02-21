package com.waad.tba.modules.provider.controller;

import com.waad.tba.common.dto.ApiResponse;
import com.waad.tba.common.excel.dto.ExcelImportResult;
import com.waad.tba.modules.provider.dto.ProviderCreateDto;
import com.waad.tba.modules.provider.dto.ProviderUpdateDto;
import com.waad.tba.modules.provider.dto.ProviderViewDto;
import com.waad.tba.modules.provider.service.ProviderExcelTemplateService;
import com.waad.tba.modules.provider.service.ProviderService;
import com.waad.tba.modules.provider.service.ProviderServiceService;
import com.waad.tba.modules.providercontract.service.ProviderContractService;
import com.waad.tba.security.AuthorizationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockMultipartFile;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("Provider controllers unit tests")
class ProviderControllerUnitTest {

    @Mock
    private ProviderService providerService;
    @Mock
    private ProviderServiceService providerServiceService;
    @Mock
    private ProviderContractService providerContractService;
    @Mock
    private AuthorizationService authorizationService;
    @Mock
    private ProviderExcelTemplateService providerExcelTemplateService;

    private ProviderController providerController;
    private ProviderExcelTemplateController providerExcelTemplateController;

    @BeforeEach
    void setUp() {
        providerController = new ProviderController(
                providerService,
                providerServiceService,
                providerContractService,
                authorizationService);

        providerExcelTemplateController = new ProviderExcelTemplateController(providerExcelTemplateService);
    }

    @Test
    @DisplayName("createProvider returns 201")
    void createProvider_returnsCreated() {
        ProviderCreateDto createDto = new ProviderCreateDto();
        ProviderViewDto viewDto = new ProviderViewDto();
        viewDto.setId(10L);

        when(providerService.createProvider(createDto)).thenReturn(viewDto);

        ResponseEntity<ApiResponse<ProviderViewDto>> response = providerController.createProvider(createDto);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(viewDto, response.getBody().getData());
        verify(providerService).createProvider(createDto);
    }

    @Test
    @DisplayName("updateProvider returns 200")
    void updateProvider_returnsOk() {
        Long providerId = 22L;
        ProviderUpdateDto updateDto = new ProviderUpdateDto();
        ProviderViewDto updated = new ProviderViewDto();
        updated.setId(providerId);

        when(providerService.updateProvider(providerId, updateDto)).thenReturn(updated);

        ResponseEntity<ApiResponse<ProviderViewDto>> response = providerController.updateProvider(providerId,
                updateDto);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(updated, response.getBody().getData());
        verify(providerService).updateProvider(providerId, updateDto);
    }

    @Test
    @DisplayName("deleteProvider returns 200")
    void deleteProvider_returnsOk() {
        Long providerId = 33L;

        ResponseEntity<ApiResponse<Void>> response = providerController.deleteProvider(providerId);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(providerService).deleteProvider(providerId);
    }

    @Test
    @DisplayName("search providers returns results")
    void searchProviders_returnsOk() {
        List<ProviderViewDto> results = List.of(new ProviderViewDto());
        when(providerService.search("clinic")).thenReturn(results);

        ResponseEntity<ApiResponse<List<ProviderViewDto>>> response = providerController.search("clinic");

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(results, response.getBody().getData());
        verify(providerService).search("clinic");
    }

    @Test
    @DisplayName("importProviders returns 200 on success")
    void importProviders_returnsOkWhenSuccess() {
        ExcelImportResult result = ExcelImportResult.builder()
                .success(true)
                .messageEn("ok")
                .build();
        MockMultipartFile file = new MockMultipartFile(
                "file", "providers.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                new byte[] { 1 });

        when(providerExcelTemplateService.importFromExcel(file)).thenReturn(result);

        ResponseEntity<ApiResponse<ExcelImportResult>> response = providerExcelTemplateController.importProviders(file);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(result, response.getBody().getData());
        verify(providerExcelTemplateService).importFromExcel(file);
    }

    @Test
    @DisplayName("downloadTemplate returns bytes")
    void downloadTemplate_returnsBytes() throws Exception {
        byte[] template = new byte[] { 9, 8, 7 };
        when(providerExcelTemplateService.generateTemplate()).thenReturn(template);

        ResponseEntity<byte[]> response = providerExcelTemplateController.downloadTemplate();

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertArrayEquals(template, response.getBody());
        verify(providerExcelTemplateService).generateTemplate();
    }
}
