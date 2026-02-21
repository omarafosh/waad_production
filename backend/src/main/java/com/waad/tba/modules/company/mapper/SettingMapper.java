package com.waad.tba.modules.company.mapper;

import com.waad.tba.modules.company.dto.SettingDto;
import com.waad.tba.modules.company.entity.Setting;
import org.springframework.stereotype.Component;

@Component
public class SettingMapper {

    public SettingDto toDto(Setting entity) {
        if (entity == null) return null;
        
        return SettingDto.builder()
                .id(entity.getId())
                .systemName(entity.getSystemName())
                .systemCode(entity.getSystemCode())
                .businessType(entity.getBusinessType())
                .logoUrl(entity.getLogoUrl())
                .faviconUrl(entity.getFaviconUrl())
                .phone(entity.getPhone())
                .email(entity.getEmail())
                .address(entity.getAddress())
                .website(entity.getWebsite())
                .taxNumber(entity.getTaxNumber())
                .currency(entity.getCurrency())
                .claimSlaDays(entity.getClaimSlaDays())
                .preApprovalSlaDays(entity.getPreApprovalSlaDays())
                .primaryColor(entity.getPrimaryColor())
                .fontFamily(entity.getFontFamily())
                .fontSize(entity.getFontSize())
                .dateCalendar(entity.getDateCalendar())
                .barcodePrefix(entity.getBarcodePrefix())
                .cardNumberFormat(entity.getCardNumberFormat())
                .dependentSuffixes(entity.getDependentSuffixes())
                .updatedAt(entity.getUpdatedAt())
                .updatedBy(entity.getUpdatedBy())
                .build();
    }

    public Setting toEntity(SettingDto dto) {
        if (dto == null) return null;

        return Setting.builder()
                .id(dto.getId())
                .systemName(dto.getSystemName())
                .systemCode(dto.getSystemCode())
                .businessType(dto.getBusinessType())
                .logoUrl(dto.getLogoUrl())
                .faviconUrl(dto.getFaviconUrl())
                .phone(dto.getPhone())
                .email(dto.getEmail())
                .address(dto.getAddress())
                .website(dto.getWebsite())
                .taxNumber(dto.getTaxNumber())
                .currency(dto.getCurrency())
                .claimSlaDays(dto.getClaimSlaDays())
                .preApprovalSlaDays(dto.getPreApprovalSlaDays())
                .primaryColor(dto.getPrimaryColor())
                .fontFamily(dto.getFontFamily())
                .fontSize(dto.getFontSize())
                .dateCalendar(dto.getDateCalendar())
                .barcodePrefix(dto.getBarcodePrefix())
                .cardNumberFormat(dto.getCardNumberFormat())
                .dependentSuffixes(dto.getDependentSuffixes())
                .build();
    }

    public void updateEntityFromDto(SettingDto dto, Setting entity) {
        if (dto == null || entity == null) return;

        entity.setSystemName(dto.getSystemName());
        entity.setSystemCode(dto.getSystemCode());
        entity.setBusinessType(dto.getBusinessType());
        entity.setLogoUrl(dto.getLogoUrl());
        entity.setFaviconUrl(dto.getFaviconUrl());
        entity.setPhone(dto.getPhone());
        entity.setEmail(dto.getEmail());
        entity.setAddress(dto.getAddress());
        entity.setWebsite(dto.getWebsite());
        entity.setTaxNumber(dto.getTaxNumber());
        entity.setCurrency(dto.getCurrency());
        entity.setClaimSlaDays(dto.getClaimSlaDays());
        entity.setPreApprovalSlaDays(dto.getPreApprovalSlaDays());
        entity.setPrimaryColor(dto.getPrimaryColor());
        entity.setFontFamily(dto.getFontFamily());
        entity.setFontSize(dto.getFontSize());
        entity.setDateCalendar(dto.getDateCalendar());
        entity.setBarcodePrefix(dto.getBarcodePrefix());
        entity.setCardNumberFormat(dto.getCardNumberFormat());
        entity.setDependentSuffixes(dto.getDependentSuffixes());
    }
}
