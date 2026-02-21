package com.waad.tba.v3.modules.member.application.dto;

import com.waad.tba.v3.core.infrastructure.excel.ExcelColumn;
import com.waad.tba.v3.modules.member.domain.Member;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/**
 * DTO for Member Excel Import/Export operations.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MemberExcelDTO {

    @ExcelColumn(name = "Full Name", order = 1, required = true)
    private String fullName;

    @ExcelColumn(name = "Civil ID", order = 2, required = true)
    private String civilId;

    @ExcelColumn(name = "Card Number", order = 3)
    private String cardNumber;

    @ExcelColumn(name = "Birth Date", order = 4)
    private LocalDate birthDate;

    @ExcelColumn(name = "Gender", order = 5)
    private String gender; // MALE, FEMALE

    @ExcelColumn(name = "Type", order = 6, description = "PRINCIPAL or DEPENDENT")
    private String type;

    @ExcelColumn(name = "Relationship", order = 7, description = "For dependents only")
    private String relationship;

    @ExcelColumn(name = "Parent Civil ID", order = 8, description = "Required for dependents")
    private String parentCivilId;

    public static MemberExcelDTO fromEntity(Member member) {
        return MemberExcelDTO.builder()
                .fullName(member.getFullName())
                .civilId(member.getCivilId())
                .cardNumber(member.getCardNumber())
                .birthDate(member.getBirthDate())
                .gender(member.getGender() != null ? member.getGender().name() : null)
                .type(member.isPrincipal() ? "PRINCIPAL" : "DEPENDENT")
                .relationship(member.getRelationship() != null ? member.getRelationship().name() : null)
                .parentCivilId(member.getParent() != null ? member.getParent().getCivilId() : null)
                .build();
    }
}
