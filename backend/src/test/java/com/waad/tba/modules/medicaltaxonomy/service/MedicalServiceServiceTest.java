package com.waad.tba.modules.medicaltaxonomy.service;

import com.waad.tba.modules.medicaltaxonomy.dto.MedicalServiceCreateDto;
import com.waad.tba.modules.medicaltaxonomy.dto.MedicalServiceResponseDto;
import com.waad.tba.modules.medicaltaxonomy.entity.MedicalCategory;
import com.waad.tba.modules.medicaltaxonomy.entity.MedicalService;
import com.waad.tba.modules.medicaltaxonomy.repository.MedicalCategoryRepository;
import com.waad.tba.modules.medicaltaxonomy.repository.MedicalServiceRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MedicalServiceServiceTest {

    @Mock
    private MedicalServiceRepository serviceRepository;

    @Mock
    private MedicalCategoryRepository categoryRepository;

    @InjectMocks
    private MedicalServiceService service;

    private MedicalService medicalService;
    private MedicalCategory category;

    @BeforeEach
    void setUp() {
        category = new MedicalCategory();
        category.setId(1L);
        category.setName("General");
        
        medicalService = MedicalService.builder()
                .id(1L)
                .code("SRV-001")
                .name("Test Service")
                .categoryId(1L)
                .basePrice(BigDecimal.TEN)
                .active(true)
                .build();
    }

    @Test
    @DisplayName("findAllActive should return list of active services")
    void findAllActive_ShouldReturnList() {
        // Arrange
        when(serviceRepository.findByActiveTrueOrderByCode()).thenReturn(List.of(medicalService));
        when(categoryRepository.findById(1L)).thenReturn(Optional.of(category));

        // Act
        List<MedicalServiceResponseDto> result = service.findAllActive();

        // Assert
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getCode()).isEqualTo("SRV-001");
        verify(serviceRepository, times(1)).findByActiveTrueOrderByCode();
    }

    @Test
    @DisplayName("delete should call repository delete (triggering Soft Delete)")
    void delete_ShouldCallRepositoryDelete() {
        // Arrange
        when(serviceRepository.findById(1L)).thenReturn(Optional.of(medicalService));

        // Act
        service.delete(1L);

        // Assert
        verify(serviceRepository, times(1)).delete(medicalService);
        // Note: Actual soft-delete SQL is handled by Hibernate @SQLDelete, which we trust here.
        // Logic test confirms we are calling the correct repository method.
    }

    @Test
    @DisplayName("create should save service and return DTO")
    void create_ShouldSaveService() {
        // Arrange
        MedicalServiceCreateDto dto = new MedicalServiceCreateDto();
        dto.setCode("SRV-002");
        dto.setName("New Service");
        dto.setCategoryId(1L);

        when(serviceRepository.existsByCode("SRV-002")).thenReturn(false);
        when(categoryRepository.findActiveById(1L)).thenReturn(Optional.of(category));
        when(serviceRepository.save(any(MedicalService.class))).thenAnswer(i -> {
            MedicalService saved = i.getArgument(0);
            saved.setId(2L);
            return saved;
        });

        // Act
        MedicalServiceResponseDto result = service.create(dto);

        // Assert
        assertThat(result).isNotNull();
        assertThat(result.getCode()).isEqualTo("SRV-002");
        verify(serviceRepository, times(1)).save(any(MedicalService.class));
    }
}
