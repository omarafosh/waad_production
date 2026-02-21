package com.waad.tba.v3.modules.member.presentation;

import com.waad.tba.v3.modules.member.application.MemberService;
import com.waad.tba.v3.modules.member.domain.Member;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/**
 * REST Controller for Unified Member Management (V3).
 */
@RestController
@RequestMapping("/api/v3/members")
@RequiredArgsConstructor
public class MemberController {

    private final MemberService memberService;

    @GetMapping
    public ResponseEntity<List<Member>> getAllActive() {
        return ResponseEntity.ok(memberService.getAllActive());
    }

    @PostMapping("/principal")
    public ResponseEntity<Member> registerPrincipal(@RequestBody Member member) {
        return ResponseEntity.ok(memberService.registerPrincipal(member));
    }

    @PostMapping("/{principalId}/dependents")
    public ResponseEntity<Member> addDependent(@PathVariable Long principalId, @RequestBody Member dependent) {
        return ResponseEntity.ok(memberService.addDependent(principalId, dependent));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteMember(@PathVariable Long id) {
        memberService.deleteMember(id);
        return ResponseEntity.noContent().build();
    }

    // --- Excel Endpoints ---

    @GetMapping("/export")
    public ResponseEntity<byte[]> exportMembers() throws Exception {
        byte[] data = memberService.exportMembers();
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=members_export.xlsx")
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(data);
    }

    @GetMapping("/template")
    public ResponseEntity<byte[]> getImportTemplate() throws Exception {
        byte[] data = memberService.getImportTemplate();
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=member_import_template.xlsx")
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(data);
    }

    @PostMapping("/import")
    public ResponseEntity<String> importMembers(@RequestParam("file") MultipartFile file) throws Exception {
        memberService.importMembers(file.getInputStream());
        return ResponseEntity.ok("Import completed successfully");
    }
}
