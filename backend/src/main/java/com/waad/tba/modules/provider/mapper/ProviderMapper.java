package com.waad.tba.modules.provider.mapper;

import org.springframework.stereotype.Component;

import com.waad.tba.modules.provider.dto.ProviderCreateDto;
import com.waad.tba.modules.provider.dto.ProviderSelectorDto;
import com.waad.tba.modules.provider.dto.ProviderUpdateDto;
import com.waad.tba.modules.provider.dto.ProviderViewDto;
import com.waad.tba.modules.provider.entity.Provider;
import com.waad.tba.modules.providercontract.entity.ProviderContract;
import com.waad.tba.modules.providercontract.entity.ProviderContract.ContractStatus;
import java.util.stream.Collectors;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Component
public class ProviderMapper {

    /**
     * Maps ProviderCreateDto to Provider entity.
     */
    public Provider toEntity(ProviderCreateDto dto) {
        return Provider.builder()
                .name(dto.getName())
                .licenseNumber(dto.getLicenseNumber())
                .taxNumber(dto.getTaxNumber())
                .city(dto.getCity())
                .address(dto.getAddress())
                .phone(dto.getPhone())
                .email(dto.getEmail())
                .providerType(dto.getProviderType() != null ? 
                        Provider.ProviderType.valueOf(dto.getProviderType()) : null)
                .networkStatus(dto.getNetworkStatus() != null ? 
                        Provider.NetworkTier.valueOf(dto.getNetworkStatus()) : null)
                .contractStartDate(dto.getContractStartDate())
                .contractEndDate(dto.getContractEndDate())
                .defaultDiscountRate(dto.getDefaultDiscountRate())
                .active(true)
                .build();
    }

    /**
     * Updates Provider entity from ProviderUpdateDto.
     */
    public void updateEntityFromDto(Provider provider, ProviderUpdateDto dto) {
        if (dto.getName() != null) {
            provider.setName(dto.getName());
        }
        if (dto.getLicenseNumber() != null) {
            provider.setLicenseNumber(dto.getLicenseNumber());
        }
        if (dto.getTaxNumber() != null) {
            provider.setTaxNumber(dto.getTaxNumber());
        }
        if (dto.getCity() != null) {
            provider.setCity(dto.getCity());
        }
        if (dto.getAddress() != null) {
            provider.setAddress(dto.getAddress());
        }
        if (dto.getPhone() != null) {
            provider.setPhone(dto.getPhone());
        }
        if (dto.getEmail() != null) {
            provider.setEmail(dto.getEmail());
        }
        if (dto.getProviderType() != null) {
            provider.setProviderType(Provider.ProviderType.valueOf(dto.getProviderType()));
        }
        if (dto.getNetworkStatus() != null) {
            provider.setNetworkStatus(Provider.NetworkTier.valueOf(dto.getNetworkStatus()));
        }
        if (dto.getContractStartDate() != null) {
            provider.setContractStartDate(dto.getContractStartDate());
        }
        if (dto.getContractEndDate() != null) {
            provider.setContractEndDate(dto.getContractEndDate());
        }
        if (dto.getDefaultDiscountRate() != null) {
            provider.setDefaultDiscountRate(dto.getDefaultDiscountRate());
        }
        if (dto.getActive() != null) {
            provider.setActive(dto.getActive());
        }
        if (dto.getAllowAllEmployers() != null) {
            provider.setAllowAllEmployers(dto.getAllowAllEmployers());
        }
    }

    /**
     * Maps Provider entity to ProviderViewDto.
     */
    public ProviderViewDto toViewDto(Provider provider) {
        return toViewDto(provider, null);
    }

    /**
     * Maps Provider entity to ProviderViewDto with document status.
     */
    public ProviderViewDto toViewDto(Provider provider, Boolean hasDocuments) {
        if (provider == null) return null;

        String typeLabel = provider.getProviderType() != null ? 
                getProviderTypeLabel(provider.getProviderType()) : null;
        String networkStatusLabel = provider.getNetworkStatus() != null ? 
                getNetworkStatusLabel(provider.getNetworkStatus()) : null;
        
        // Calculate contract info
        // Calculate contract info
        List<String> employerNames = new ArrayList<>();
        int activeContractCount = 0;
        
        if (provider.getContracts() != null) {
            // Filter for relevant contracts (Active, Draft, Suspended)
            // We exclude TERMINATED and EXPIRED from the main list view to avoid clutter
            List<ProviderContract> activeContracts = provider.getContracts().stream()
                    .filter(c -> Boolean.TRUE.equals(c.getActive()) && 
                                 (c.getStatus() == ContractStatus.ACTIVE || 
                                  c.getStatus() == ContractStatus.DRAFT || 
                                  c.getStatus() == ContractStatus.SUSPENDED))
                    .collect(Collectors.toList());
                    
            activeContractCount = activeContracts.size();
            
            if (!activeContracts.isEmpty()) {
                activeContracts.stream()
                        .filter(c -> c.getEmployer() != null)
                        .map(c -> c.getEmployer().getName())
                        .distinct()
                        .forEach(employerNames::add);
            }
        }


        
        // Add TPA Model Employers to the names list
        if (provider.getAllowedEmployers() != null) {
            provider.getAllowedEmployers().stream()
                .filter(pae -> Boolean.TRUE.equals(pae.getActive()) && pae.getEmployer() != null)
                .map(pae -> pae.getEmployer().getName())
                .filter(name -> !employerNames.contains(name))
                .forEach(employerNames::add);
        }
        
        // Update count to reflect total unique employers if we found extra from TPA model
        if (employerNames.size() > activeContractCount) {
             activeContractCount = employerNames.size();
        }

        // If 'Allow All Employers' is enabled, add a special indicator
        if (Boolean.TRUE.equals(provider.getAllowAllEmployers())) {
            employerNames.add(0, "الشبكة العامة (جميع الجهات)");
            // Ensure count reflects this permission even if no physical contracts exist
            if (activeContractCount == 0 || activeContractCount == employerNames.size() - 1) {
                activeContractCount = employerNames.size();
            }
        }

        return ProviderViewDto.builder()
                .id(provider.getId())
                .name(provider.getName())
                .licenseNumber(provider.getLicenseNumber())
                .taxNumber(provider.getTaxNumber())
                .city(provider.getCity())
                .address(provider.getAddress())
                .phone(provider.getPhone())
                .email(provider.getEmail())
                .providerType(provider.getProviderType() != null ? 
                        provider.getProviderType().name() : null)
                .providerTypeLabel(typeLabel)
                .networkStatus(provider.getNetworkStatus() != null ? 
                        provider.getNetworkStatus().name() : null)
                .networkStatusLabel(networkStatusLabel)
                .active(provider.getActive())
                .contractStartDate(provider.getContractStartDate())
                .contractEndDate(provider.getContractEndDate())
                .defaultDiscountRate(provider.getDefaultDiscountRate())
                .allowAllEmployers(provider.getAllowAllEmployers())
                .createdAt(provider.getCreatedAt())
                .updatedAt(provider.getUpdatedAt())
                .contractCount(activeContractCount)
                .contractedEmployerNames(employerNames)
                .hasDocuments(hasDocuments)
                .build();
    }

    /**
     * Maps Provider entity to ProviderSelectorDto for dropdown lists.
     */
    public ProviderSelectorDto toSelectorDto(Provider provider) {
        if (provider == null) return null;
        
        return ProviderSelectorDto.builder()
                .id(provider.getId())
                .code(provider.getLicenseNumber())
                .name(provider.getName())
                .providerType(provider.getProviderType() != null 
                        ? getProviderTypeLabel(provider.getProviderType()) 
                        : null)
                .build();
    }

    private String getProviderTypeLabel(Provider.ProviderType type) {
        return switch (type) {
            case HOSPITAL -> "مستشفى";
            case CLINIC -> "عيادة";
            case LAB -> "مختبر";
            case PHARMACY -> "صيدلية";
            case RADIOLOGY -> "أشعة";
        };
    }

    private String getNetworkStatusLabel(Provider.NetworkTier tier) {
        return switch (tier) {
            case IN_NETWORK -> "داخل الشبكة";
            case OUT_OF_NETWORK -> "خارج الشبكة";
            case PREFERRED -> "مزود مفضل";
        };
    }
}
