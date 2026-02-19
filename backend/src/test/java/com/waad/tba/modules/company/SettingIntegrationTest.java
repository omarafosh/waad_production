package com.waad.tba.modules.company;

import com.waad.tba.modules.company.dto.SettingDto;
import com.waad.tba.modules.company.entity.Setting;
import com.waad.tba.modules.company.repository.SettingRepository;
import com.waad.tba.modules.company.service.SettingService;
import com.waad.tba.common.entity.Organization;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
public class SettingIntegrationTest {

    @Autowired
    private SettingService settingService;

    @Autowired
    private SettingRepository settingRepository;

    @Autowired
    private EntityManager entityManager;

    @Test
    @Transactional
    void testSystemSettingsRetrieval() {
        // Ensure data exists if Flyway didn't run in this environment
        if (settingRepository.count() == 0) {
            Setting setting = Setting.builder()
                    .systemName("Test System")
                    .systemCode("TOP_DOCS")
                    .currency("LYD")
                    .build();
            settingRepository.save(setting);
            entityManager.flush();
        }

        // When: The system should have settings initialized
        SettingDto settings = settingService.getSettings();

        // Then
        assertThat(settings).isNotNull();
        assertThat(settings.getSystemCode()).isEqualTo("TOP_DOCS");
    }

    @Test
    void testOrganizationMapping() {
        // Given
        Organization org = Organization.builder()
                .name("Test Employer")
                .code("EMP001")
                .active(true)
                .build();

        entityManager.persist(org);
        entityManager.flush();

        // When
        Organization found = entityManager.find(Organization.class, org.getId());

        // Then
        assertThat(found).isNotNull();
        assertThat(found.getName()).isEqualTo("Test Employer");
    }
}
