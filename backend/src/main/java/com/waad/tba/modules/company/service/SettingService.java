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
    @Transactional(readOnly = true)
    public SettingDto getSettings() {
        log.info("Fetching global system settings");
        
        // Strategy: In single-tenant mode, we take the first available record
        return settingRepository.findAll().stream()
                .findFirst()
                .map(settingMapper::toDto)
                .orElseThrow(() -> new ResourceNotFoundException("Global settings not found. System configuration missing."));
    }

    /**
     * Update system settings
     */
    @Transactional
    public SettingDto updateSettings(SettingDto dto, String updatedBy) {
        log.info("Updating global system settings by {}", updatedBy);

        Setting setting = settingRepository.findById(1L)
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
                    .currency("LYD")
                    .barcodePrefix("TD")
                    .claimSlaDays(10)
                    .preApprovalSlaDays(3)
                    .primaryColor("#1890ff")
                    .build();
            
            Setting saved = settingRepository.save(defaultSetting);
            return settingMapper.toDto(saved);
        }
        return getSettings();
    }
}
