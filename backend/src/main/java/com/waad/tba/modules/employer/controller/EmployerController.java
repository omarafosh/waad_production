package com.waad.tba.modules.employer.controller;

import com.waad.tba.common.dto.ApiResponse;
import com.waad.tba.modules.employer.dto.EmployerCreateDto;
import com.waad.tba.modules.employer.dto.EmployerResponseDto;
import com.waad.tba.modules.employer.dto.EmployerSelectorDto;
import com.waad.tba.modules.employer.dto.EmployerUpdateDto;
import com.waad.tba.modules.employer.service.EmployerService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/employers")
@RequiredArgsConstructor
public class EmployerController {

    private final EmployerService service;

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'INSURANCE_ADMIN') or hasAuthority('EMPLOYER_VIEW')")
    public ResponseEntity<ApiResponse<org.springframework.data.domain.Page<EmployerResponseDto>>> getAll(
            @org.springdoc.core.annotations.ParameterObject org.springframework.data.domain.Pageable pageable,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Boolean deleted,
            @RequestParam(required = false) Boolean active,
            @RequestParam(required = false) Boolean hasPolicy) {
        org.springframework.data.domain.Page<EmployerResponseDto> employers = service.getAll(pageable, search, deleted, active, hasPolicy);
        return ResponseEntity.ok(ApiResponse.success(employers));
    }

    @GetMapping({ "/selectors", "/selector" })
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'INSURANCE_ADMIN', 'EMPLOYER_ADMIN', 'PROVIDER') or hasAuthority('EMPLOYER_VIEW')")
    public ResponseEntity<ApiResponse<List<EmployerSelectorDto>>> selectors() {
        List<EmployerSelectorDto> selectors = service.getSelectors();
        return ResponseEntity.ok(ApiResponse.success(selectors));
    }

    @GetMapping("/{id:\\d+}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'INSURANCE_ADMIN') or hasAuthority('EMPLOYER_VIEW')")
    public ResponseEntity<ApiResponse<EmployerResponseDto>> getById(@PathVariable Long id) {
        EmployerResponseDto employer = service.getById(id);
        return ResponseEntity.ok(ApiResponse.success("Employer retrieved successfully", employer));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'INSURANCE_ADMIN') or hasAuthority('EMPLOYER_CREATE')")
    public ResponseEntity<ApiResponse<EmployerResponseDto>> create(@Valid @RequestBody EmployerCreateDto dto) {
        EmployerResponseDto created = service.create(dto);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Employer created successfully", created));
    }

    @PutMapping("/{id:\\d+}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'INSURANCE_ADMIN') or hasAuthority('EMPLOYER_UPDATE')")
    public ResponseEntity<ApiResponse<EmployerResponseDto>> update(
            @PathVariable Long id,
            @Valid @RequestBody EmployerUpdateDto dto) {
        EmployerResponseDto updated = service.update(id, dto);
        return ResponseEntity.ok(ApiResponse.success("Employer updated successfully", updated));
    }

    @DeleteMapping("/{id:\\d+}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'INSURANCE_ADMIN') or hasAuthority('EMPLOYER_DELETE')")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.ok(ApiResponse.success("Employer deleted successfully", null));
    }

    /**
     * Archive employer (safe alternative to delete)
     * Sets archived=true, hiding from default lists while preserving all data
     */
    @PostMapping("/{id:\\d+}/archive")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'INSURANCE_ADMIN') or hasAuthority('EMPLOYER_MANAGE')")
    public ResponseEntity<ApiResponse<EmployerResponseDto>> archive(@PathVariable Long id) {
        EmployerResponseDto archived = service.archive(id);
        return ResponseEntity.ok(ApiResponse.success("Employer archived successfully", archived));
    }

    /**
     * Restore archived employer
     * Sets archived=false, making employer visible again
     */
    @PostMapping("/{id:\\d+}/restore")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'INSURANCE_ADMIN') or hasAuthority('MANAGE_EMPLOYERS')")
    public ResponseEntity<ApiResponse<EmployerResponseDto>> restore(@PathVariable Long id) {
        EmployerResponseDto restored = service.restore(id);
        return ResponseEntity.ok(ApiResponse.success("Employer restored successfully", restored));
    }

    @GetMapping("/count")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'INSURANCE_ADMIN') or hasAuthority('EMPLOYER_VIEW')")
    public ResponseEntity<ApiResponse<Long>> count() {
        long total = service.count();
        return ResponseEntity.ok(ApiResponse.success(total));
    }
    @GetMapping("/export/excel")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'INSURANCE_ADMIN') or hasAuthority('EMPLOYER_EXPORT')")
    public ResponseEntity<byte[]> exportToExcel() throws java.io.IOException {
        byte[] excelData = service.exportToExcel();
        
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_OCTET_STREAM);
        headers.setContentDispositionFormData("attachment", "Employers_List.xlsx");
        headers.setContentLength(excelData.length);
        
        return ResponseEntity.ok()
                .headers(headers)
                .body(excelData);
    }
}
