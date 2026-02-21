package com.waad.tba.modules.company.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SettingDto {
    private Long id;
    private String systemName;
    private String systemCode;
    private String businessType;
    private String logoUrl;
    private String faviconUrl;
    private String phone;
    private String email;
    private String address;
    private String website;
    private String taxNumber;
    private String currency;
    private Integer claimSlaDays;
    private Integer preApprovalSlaDays;
    private String primaryColor;
    private String fontFamily;
    private Double fontSize;
    private String dateCalendar;
    private String barcodePrefix;
    private String cardNumberFormat;
    private String dependentSuffixes;
    private LocalDateTime updatedAt;
    private String updatedBy;
}
