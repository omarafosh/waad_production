package com.waad.tba.modules.medicaltaxonomy.service;

import com.waad.tba.modules.medicaltaxonomy.dto.MappingSuggestionDto;
import com.waad.tba.modules.medicaltaxonomy.entity.*;
import com.waad.tba.modules.medicaltaxonomy.repository.*;
import com.waad.tba.modules.provider.entity.Provider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ServiceMappingEngineSafetyTest {
    @Mock MedicalServiceRepository masterRepository;
    @Mock ProviderRawServiceRepository rawRepository;
    @Mock SafeMedicalServiceAliasRepository safeAliasRepository;
    @Mock MedicalServiceExclusionRepository exclusionRepository;
    @Mock MedicalServiceSplitQueueRepository splitRepository;
    @Mock EnterpriseServiceAliasRepository legacyRepository;
    ServiceMappingEngine engine;

    @BeforeEach
    void setup() {
        engine = new ServiceMappingEngine(masterRepository, rawRepository, safeAliasRepository,
                exclusionRepository, splitRepository, legacyRepository);
    }

    @Test
    void shortOpaqueNameNeverRunsFuzzyAutoMapping() {
        ProviderRawService raw = ProviderRawService.builder().id(1L).provider(provider(7L))
                .serviceCode("1").serviceName("CT").build();
        when(rawRepository.findById(1L)).thenReturn(Optional.of(raw));
        stubNoPolicy("ct");
        when(safeAliasRepository.findProviderCodeMatches(7L, "1")).thenReturn(List.of());
        when(safeAliasRepository.findProviderAliasMatches(7L, "ct")).thenReturn(List.of());
        when(safeAliasRepository.findGlobalAliasMatches("ct")).thenReturn(List.of());
        when(legacyRepository.findByAliasTextIgnoreCase("CT")).thenReturn(List.of());

        List<MappingSuggestionDto> result = engine.getSuggestions(1L, "CT", "1");

        assertEquals("REVIEW_REQUIRED", result.get(0).getDecision());
        verify(masterRepository, never()).findAll();
    }

    @Test
    void exactExclusionStopsMapping() {
        ProviderRawService raw = ProviderRawService.builder().id(2L).provider(provider(7L))
                .serviceCode("X").serviceName("Chemical Peel").build();
        MedicalServiceExclusion exclusion = MedicalServiceExclusion.builder()
                .exclusionType("COSMETIC").reason("Policy").build();
        when(rawRepository.findById(2L)).thenReturn(Optional.of(raw));
        when(exclusionRepository.findFirstByAliasNormalizedAndStatusOrderByConfidenceDesc(
                "chemical peel", "EXCLUDED")).thenReturn(Optional.of(exclusion));

        List<MappingSuggestionDto> result = engine.getSuggestions(2L, null, null);

        assertEquals("EXCLUDED", result.get(0).getDecision());
        verifyNoInteractions(safeAliasRepository, masterRepository);
    }

    @Test
    void providerAliasTakesPriorityOverGlobalAlias() {
        ProviderRawService raw = ProviderRawService.builder().id(3L).provider(provider(7L))
                .serviceCode("P-1").serviceName("صورة على الركبة").build();
        SafeMedicalServiceAlias providerAlias = alias(master(11L, "WAC-IMG-MRI", "رنين الركبة"),
                "PROVIDER", 0.99, true);

        when(rawRepository.findById(3L)).thenReturn(Optional.of(raw));
        stubNoPolicy("صوره علي الركبه");
        when(safeAliasRepository.findProviderCodeMatches(7L, "p 1")).thenReturn(List.of());
        when(safeAliasRepository.findProviderAliasMatches(7L, "صوره علي الركبه"))
                .thenReturn(List.of(providerAlias));

        List<MappingSuggestionDto> result = engine.getSuggestions(3L, null, null);

        assertEquals(11L, result.get(0).getMasterServiceId());
        assertEquals("AUTO_APPROVE", result.get(0).getDecision());
        verify(safeAliasRepository, never()).findGlobalAliasMatches(anyString());
    }

    @Test
    void conflictingExactAliasesAreNeverAutoApproved() {
        ProviderRawService raw = ProviderRawService.builder().id(4L).provider(provider(7L))
                .serviceCode("A-1").serviceName("Echo").build();
        SafeMedicalServiceAlias first = alias(master(21L, "WAC-CARD-ECHO", "إيكو القلب"),
                "PROVIDER", 0.99, true);
        SafeMedicalServiceAlias second = alias(master(22L, "WAC-IMG-US", "موجات فوق صوتية"),
                "PROVIDER", 0.99, true);

        when(rawRepository.findById(4L)).thenReturn(Optional.of(raw));
        stubNoPolicy("echo");
        when(safeAliasRepository.findProviderCodeMatches(7L, "a 1")).thenReturn(List.of());
        when(safeAliasRepository.findProviderAliasMatches(7L, "echo"))
                .thenReturn(List.of(first, second));

        List<MappingSuggestionDto> result = engine.getSuggestions(4L, null, null);

        assertEquals("REVIEW_REQUIRED", result.get(0).getDecision());
        assertEquals("PROVIDER_ALIAS_CONFLICT", result.get(0).getMatchSource());
        assertFalse(result.get(0).getAutoApprove());
    }

    @Test
    void migrationCorrectsExistingMasterCategoryToLatestOfficialCat() throws Exception {
        String migration = java.nio.file.Files.readString(java.nio.file.Path.of(
                "src/main/resources/db/migration/V20260804_1__safe_medical_dictionary_alias_schema.sql"));
        assertTrue(migration.contains("category_id=EXCLUDED.category_id"));
        assertTrue(migration.contains("category=EXCLUDED.category"));
        assertFalse(migration.contains("category_id=COALESCE(medical_services.category_id"));
    }

    private void stubNoPolicy(String normalized) {
        when(exclusionRepository.findFirstByAliasNormalizedAndStatusOrderByConfidenceDesc(normalized, "EXCLUDED"))
                .thenReturn(Optional.empty());
        when(splitRepository.findFirstByServiceNormalizedAndStatusOrderByConfidenceDesc(normalized, "SPLIT_REQUIRED"))
                .thenReturn(Optional.empty());
    }

    private Provider provider(Long id) {
        return Provider.builder().id(id).name("P").licenseNumber("L")
                .providerType(Provider.ProviderType.CLINIC).build();
    }

    private MedicalService master(Long id, String code, String name) {
        return MedicalService.builder().id(id).code(code).name(name).active(true).build();
    }

    private SafeMedicalServiceAlias alias(MedicalService master, String scope,
                                          double confidence, boolean autoApprove) {
        return SafeMedicalServiceAlias.builder()
                .medicalService(master).medicalServiceId(master.getId())
                .matchScope(scope).confidence(confidence).autoApprove(autoApprove)
                .status("READY").notes("test").build();
    }
}
