package com.waad.tba.modules.company.service;

import com.waad.tba.modules.company.dto.SettingDto;
import com.waad.tba.modules.company.entity.Setting;
import com.waad.tba.modules.company.mapper.SettingMapper;
import com.waad.tba.modules.company.repository.SettingRepository;
import com.waad.tba.common.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class SettingService {

    private final SettingRepository settingRepository;
    private final SettingMapper settingMapper;

    /**
     * Get system settings (ID: 1)
     * If not exists, return null or handle accordingly.
     */
    @Transactional
    public SettingDto getSettings() {
        log.info("Fetching global system settings");
        
        // Resilience Strategy: Return first record or initialize if table is empty
        return settingRepository.findAll().stream()
                .findFirst()
                .map(settingMapper::toDto)
                .orElseGet(this::initializeDefaultSettings);
    }

    /**
     * Update system settings
     */
    @Transactional
    public SettingDto updateSettings(SettingDto dto, String updatedBy) {
        log.info("Updating global system settings by {}", updatedBy);

        // Resilience Strategy: Find first available or throw if absolutely none
        Setting setting = settingRepository.findAll().stream()
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Global settings not found. Cannot update."));

        settingMapper.updateEntityFromDto(dto, setting);
        setting.setUpdatedBy(updatedBy);
        
        Setting saved = settingRepository.save(setting);
        log.info("Settings updated successfully");
        
        return settingMapper.toDto(saved);
    }
    
    /**
     * Initialize default settings if missing
     */
    @Transactional
    public SettingDto initializeDefaultSettings() {
        if (!settingRepository.existsById(1L)) {
            log.info("Initializing default system settings");
            Setting defaultSetting = Setting.builder()
                    .systemName("Top Doctors TPA")
                    .systemCode("TOP_DOCS")
                    .businessType("Health Insurance")
                    .currency("LYD")
                    .barcodePrefix("TD")
                    .cardNumberFormat("[MP_NO]-[YEAR]-[PRO]")
                    .dependentSuffixes("{\"WIFE\":\"W\",\"HUSBAND\":\"H\",\"SON\":\"S\",\"DAUGHTER\":\"D\",\"FATHER\":\"F\",\"MOTHER\":\"M\",\"BROTHER\":\"B\",\"SISTER\":\"I\"}")
                    .claimSlaDays(10)
                    .preApprovalSlaDays(3)
                    .primaryColor("#1890ff")
                    .fontFamily("Cairo")
                    .fontSize(14.0)
                    .build();
            
            Setting saved = settingRepository.save(defaultSetting);
            return settingMapper.toDto(saved);
        }
        return getSettings();
    }
}
