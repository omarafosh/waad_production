package com.waad.tba.modules.member.controller;

import java.io.IOException;
import java.time.LocalDate;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.waad.tba.common.dto.ApiResponse;
import com.waad.tba.modules.member.dto.DependentMemberDto;
import com.waad.tba.modules.member.dto.FamilyEligibilityResponseDto;
import com.waad.tba.modules.member.dto.MemberCreateDto;
import com.waad.tba.modules.member.dto.MemberSearchCriteria;
import com.waad.tba.modules.member.dto.MemberUpdateDto;
import com.waad.tba.modules.member.dto.MemberViewDto;
import com.waad.tba.modules.member.entity.MemberWorkflowHistory;
import com.waad.tba.modules.member.service.MemberService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@RestController
@RequestMapping({ "/api/members", "/api/v1/members", "/api/v1/unified-members" })
@RequiredArgsConstructor
@Tag(name = "Member Management", description = "REST API for members and family management")
public class MemberController {

    private final MemberService memberService;

    @PostMapping
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('MEMBER_CREATE')")
    @Operation(summary = "Create Principal Member", description = "Creates a new principal member with optional inline dependents.")
    public ResponseEntity<ApiResponse<MemberViewDto>> createPrincipal(@Valid @RequestBody MemberCreateDto dto) {
        MemberViewDto created = memberService.createPrincipal(dto);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Member created successfully", created));
    }

    @PostMapping("/{principalId}/dependents")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('MEMBER_CREATE')")
    @Operation(summary = "Add Dependent", description = "Adds a new dependent member to an existing principal.")
    public ResponseEntity<ApiResponse<MemberViewDto>> addDependent(
            @PathVariable Long principalId,
            @Valid @RequestBody DependentMemberDto dto) {
        MemberViewDto created = memberService.createDependent(principalId, dto);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Dependent added successfully", created));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('MEMBER_VIEW')")
    @Operation(summary = "Get Member by ID")
    public ResponseEntity<MemberViewDto> getById(@PathVariable Long id) {
        return ResponseEntity.ok(memberService.getById(id));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('MEMBER_EDIT')")
    @Operation(summary = "Update Member")
    public ResponseEntity<MemberViewDto> update(@PathVariable Long id, @Valid @RequestBody MemberUpdateDto dto) {
        return ResponseEntity.ok(memberService.update(id, dto));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('MEMBER_DELETE')")
    @Operation(summary = "Soft Delete Member")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        memberService.delete(id);
        return ResponseEntity.ok(ApiResponse.success("Member deleted successfully", null));
    }

    @PostMapping("/{id}/restore")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Operation(summary = "Restore Deleted Member")
    public ResponseEntity<ApiResponse<Void>> restore(@PathVariable Long id) {
        memberService.restore(id);
        return ResponseEntity.ok(ApiResponse.success("Member restored successfully", null));
    }

    @PostMapping("/{id}/activate")
    @PreAuthorize("hasAuthority('MEMBER_MANAGE')")
    @Operation(summary = "Activate Member")
    public ResponseEntity<MemberViewDto> activate(@PathVariable Long id,
            @RequestParam(required = false) String reason) {
        return ResponseEntity.ok(memberService.activate(id, reason));
    }

    @PostMapping("/{id}/suspend")
    @PreAuthorize("hasAuthority('MEMBER_MANAGE')")
    @Operation(summary = "Suspend Member")
    public ResponseEntity<MemberViewDto> suspend(@PathVariable Long id, @RequestParam String reason) {
        return ResponseEntity.ok(memberService.suspend(id, reason));
    }

    @GetMapping("/{id}/history")
    @PreAuthorize("hasAuthority('MEMBER_VIEW')")
    @Operation(summary = "Get Member History")
    public ResponseEntity<List<MemberWorkflowHistory>> getHistory(@PathVariable Long id) {
        return ResponseEntity.ok(memberService.getHistory(id));
    }

    @GetMapping({ "", "/search" })
    @PreAuthorize("hasAuthority('MEMBER_VIEW')")
    @Operation(summary = "Search Members")
    public ResponseEntity<Page<MemberViewDto>> search(
            @ModelAttribute MemberSearchCriteria criteria,
            Pageable pageable) {
        return ResponseEntity.ok(memberService.search(criteria, pageable));
    }

    @GetMapping("/export/excel")
    @PreAuthorize("hasAuthority('MEMBER_EXPORT')")
    @Operation(summary = "Export Members to Excel")
    public ResponseEntity<byte[]> exportToExcel(@ModelAttribute MemberSearchCriteria criteria) throws IOException {
        byte[] excelBytes = memberService.exportToExcel(criteria);
        String filename = "members-export-" + LocalDate.now() + ".xlsx";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(
                        MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(excelBytes);
    }

    @GetMapping("/eligibility")
    @Operation(summary = "Check Family Eligibility", description = "Search by principal barcode or card number.")
    public ResponseEntity<FamilyEligibilityResponseDto> checkEligibility(@RequestParam String query) {
        return ResponseEntity.ok(memberService.checkEligibility(query));
    }

    @PostMapping(value = "/{id}/photo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAuthority('MEMBER_EDIT')")
    @Operation(summary = "Upload Member Photo")
    public ResponseEntity<ApiResponse<MemberViewDto>> uploadPhoto(
            @PathVariable Long id,
            @RequestParam("file") org.springframework.web.multipart.MultipartFile file) {
        MemberViewDto updated = memberService.uploadPhoto(id, file);
        return ResponseEntity.ok(ApiResponse.success("Photo uploaded successfully", updated));
    }

    @DeleteMapping("/{id}/photo")
    @PreAuthorize("hasAuthority('MEMBER_EDIT')")
    @Operation(summary = "Delete Member Photo")
    public ResponseEntity<ApiResponse<Void>> deletePhoto(@PathVariable Long id) {
        memberService.deletePhoto(id);
        return ResponseEntity.ok(ApiResponse.success("Photo deleted successfully", null));
    }
}
