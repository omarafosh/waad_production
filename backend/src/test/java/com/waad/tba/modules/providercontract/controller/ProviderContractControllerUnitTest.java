package com.waad.tba.modules.providercontract.controller;

import com.waad.tba.common.dto.ApiResponse;
import com.waad.tba.common.excel.dto.ExcelImportResult;
import com.waad.tba.modules.providercontract.dto.ProviderContractCreateDto;
import com.waad.tba.modules.providercontract.dto.ProviderContractResponseDto;
import com.waad.tba.modules.providercontract.entity.ProviderContract;
import com.waad.tba.modules.providercontract.service.PriceListExcelTemplateService;
import com.waad.tba.modules.providercontract.service.ProviderContractPricingItemService;
import com.waad.tba.modules.providercontract.service.ProviderContractService;
import com.waad.tba.security.AuthorizationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
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
@DisplayName("Provider contract controllers unit tests")
class ProviderContractControllerUnitTest {

    @Mock
    private ProviderContractService contractService;
    @Mock
    private ProviderContractPricingItemService pricingService;
    @Mock
    private PriceListExcelTemplateService templateService;
    @Mock
    private AuthorizationService authorizationService;

    private ProviderContractController providerContractController;
    private ProviderContractPricingExcelController pricingExcelController;

    @BeforeEach
    void setUp() {
        providerContractController = new ProviderContractController(contractService, pricingService);
        pricingExcelController = new ProviderContractPricingExcelController(templateService, authorizationService);
    }

    @Test
    @DisplayName("create contract returns 201")
    void createContract_returnsCreated() {
        ProviderContractCreateDto createDto = new ProviderContractCreateDto();
        ProviderContractResponseDto responseDto = new ProviderContractResponseDto();

        when(contractService.create(createDto)).thenReturn(responseDto);

        ResponseEntity<ApiResponse<ProviderContractResponseDto>> response = providerContractController.create(createDto);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(responseDto, response.getBody().getData());
        verify(contractService).create(createDto);
    }

    @Test
    @DisplayName("search contracts returns page")
    void searchContracts_returnsOk() {
        Page<ProviderContractResponseDto> page = new PageImpl<>(List.of(new ProviderContractResponseDto()));
        when(contractService.search("C-01", ProviderContract.ContractStatus.ACTIVE, PageRequest.of(0, 20))).thenReturn(page);

        ResponseEntity<ApiResponse<Page<ProviderContractResponseDto>>> response = providerContractController.search(
                "C-01", ProviderContract.ContractStatus.ACTIVE, PageRequest.of(0, 20));

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(page, response.getBody().getData());
        verify(contractService).search("C-01", ProviderContract.ContractStatus.ACTIVE, PageRequest.of(0, 20));
    }

    @Test
    @DisplayName("delete contract returns 200")
    void deleteContract_returnsOk() {
        ResponseEntity<ApiResponse<Void>> response = providerContractController.delete(200L);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(contractService).delete(200L);
    }

    @Test
    @DisplayName("download pricing template returns bytes")
    void downloadPricingTemplate_returnsBytes() throws Exception {
        byte[] bytes = new byte[] { 1, 2, 3, 4 };
        when(templateService.generateTemplate(88L)).thenReturn(bytes);

        ResponseEntity<?> response = pricingExcelController.downloadTemplate(88L);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertArrayEquals(bytes, (byte[]) response.getBody());
        verify(templateService).generateTemplate(88L);
    }

    @Test
    @DisplayName("import pricing returns success envelope")
    void importPricing_returnsSuccess() throws Exception {
        ExcelImportResult result = ExcelImportResult.builder().success(true).messageEn("ok").build();
        MockMultipartFile file = new MockMultipartFile(
                "file", "pricing.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", new byte[] { 7 });

        when(templateService.importFromExcel(77L, file)).thenReturn(result);

        ResponseEntity<ApiResponse<ExcelImportResult>> response = pricingExcelController.importPriceList(77L, file);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(result, response.getBody().getData());
        verify(templateService).importFromExcel(77L, file);
    }
}
