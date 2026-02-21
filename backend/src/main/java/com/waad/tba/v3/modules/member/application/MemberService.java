package com.waad.tba.v3.modules.member.application;

import com.waad.tba.v3.core.infrastructure.excel.ExcelService;
import com.waad.tba.v3.modules.member.application.dto.MemberExcelDTO;
import com.waad.tba.v3.modules.member.domain.Member;
import com.waad.tba.v3.modules.member.infrastructure.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.InputStream;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MemberService {

    private final MemberRepository memberRepository;
    private final ExcelService excelService;

    @Transactional
    public Member registerPrincipal(Member member) {
        if (member.getBarcode() == null || member.getBarcode().isEmpty()) {
            member.setBarcode("WAD-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        }
        return memberRepository.save(member);
    }

    @Transactional
    public Member addDependent(Long principalId, Member dependent) {
        Member principal = memberRepository.findById(principalId)
                .orElseThrow(() -> new RuntimeException("Principal not found"));
        
        principal.addDependent(dependent);
        return memberRepository.save(dependent);
    }

    @Transactional
    public void deleteMember(Long id) {
        memberRepository.deleteById(id);
    }

    public List<Member> getAllActive() {
        return memberRepository.findAll();
    }

    // --- Excel Operations ---

    public byte[] exportMembers() throws Exception {
        List<MemberExcelDTO> dtos = memberRepository.findAll().stream()
                .map(MemberExcelDTO::fromEntity)
                .collect(Collectors.toList());
        return excelService.exportToExcel(dtos, MemberExcelDTO.class);
    }

    public byte[] getImportTemplate() throws Exception {
        return excelService.generateTemplate(MemberExcelDTO.class);
    }

    @Transactional
    public void importMembers(InputStream inputStream) throws Exception {
        List<MemberExcelDTO> dtos = excelService.importFromExcel(inputStream, MemberExcelDTO.class);
        
        for (MemberExcelDTO dto : dtos) {
            if ("PRINCIPAL".equalsIgnoreCase(dto.getType())) {
                Member principal = Member.builder()
                        .fullName(dto.getFullName())
                        .civilId(dto.getCivilId())
                        .cardNumber(dto.getCardNumber())
                        .birthDate(dto.getBirthDate())
                        .gender(parseGender(dto.getGender()))
                        .build();
                registerPrincipal(principal);
            } else if ("DEPENDENT".equalsIgnoreCase(dto.getType())) {
                Member principal = memberRepository.findByCivilId(dto.getParentCivilId())
                        .orElseThrow(() -> new RuntimeException("Principal not found for dependent: " + dto.getFullName()));
                
                Member dependent = Member.builder()
                        .fullName(dto.getFullName())
                        .civilId(dto.getCivilId())
                        .cardNumber(dto.getCardNumber())
                        .birthDate(dto.getBirthDate())
                        .gender(parseGender(dto.getGender()))
                        .relationship(parseRelationship(dto.getRelationship()))
                        .build();
                addDependent(principal.getId(), dependent);
            }
        }
    }

    private Member.Gender parseGender(String gender) {
        try { return Member.Gender.valueOf(gender.toUpperCase()); }
        catch (Exception e) { return Member.Gender.OTHER; }
    }

    private Member.Relationship parseRelationship(String rel) {
        try { return Member.Relationship.valueOf(rel.toUpperCase()); }
        catch (Exception e) { return null; }
    }
}
