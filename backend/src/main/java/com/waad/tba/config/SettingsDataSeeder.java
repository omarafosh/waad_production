package com.waad.tba.config;

import com.waad.tba.common.entity.SystemSetting;
import com.waad.tba.common.repository.SystemSettingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;

/**
 * Seeds default system settings.
 */
@Component
@Order(20) // Run after basic data seeds
@RequiredArgsConstructor
@Slf4j
public class SettingsDataSeeder implements CommandLineRunner {

    private final SystemSettingRepository systemSettingRepository;

    @Override
    public void run(String... args) throws Exception {
        log.info("⚙️ Checking System Settings seed data...");

        List<SystemSetting> defaultSettings = Arrays.asList(
            SystemSetting.builder()
                .settingKey("SYSTEM_NAME")
                .settingValue("TBA WAAD System")
                .description("System Name used in reports and headers")
                .category("BRANDING")
                .valueType(SystemSetting.SettingValueType.STRING)
                .isEditable(true)
                .build(),

            SystemSetting.builder()
                .settingKey("SYSTEM_CURRENCY")
                .settingValue("SAR")
                .description("Default System Currency")
                .category("FINANCE")
                .valueType(SystemSetting.SettingValueType.STRING)
                .isEditable(true)
                .build(),

            SystemSetting.builder()
                .settingKey("SYSTEM_LOGO_URL")
                .settingValue("") // Empty by default
                .description("URL or Path to the System Logo")
                .category("BRANDING")
                .valueType(SystemSetting.SettingValueType.STRING)
                .isEditable(true)
                .build(),

            SystemSetting.builder()
                .settingKey("CARD_NUMBER_FORMAT")
                .settingValue("[PRO]-[YEAR]-[EMP_NO][REL_SUFFIX]")
                .description("Smart Card Numbering Format. Tokens: [PRO], [YEAR], [EMP_NO], [REL_SUFFIX]")
                .category("MEMBERSHIP")
                .valueType(SystemSetting.SettingValueType.STRING)
                .isEditable(true)
                .validationRules("required")
                .build()
        );

        for (SystemSetting setting : defaultSettings) {
            if (!systemSettingRepository.existsBySettingKey(setting.getSettingKey())) {
                setting.setCreatedAt(LocalDateTime.now());
                setting.setUpdatedAt(LocalDateTime.now());
                systemSettingRepository.save(setting);
                log.info("   ➕ Seeded setting: {}", setting.getSettingKey());
            }
        }
    }
}
