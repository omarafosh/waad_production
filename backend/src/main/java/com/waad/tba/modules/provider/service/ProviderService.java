package com.waad.tba.modules.provider.service;

import com.waad.tba.common.entity.Organization;
import com.waad.tba.common.repository.OrganizationRepository;
import com.waad.tba.modules.provider.dto.AllowedEmployerDto;
import com.waad.tba.modules.provider.dto.ProviderCreateDto;
import com.waad.tba.modules.provider.dto.ProviderSelectorDto;
import com.waad.tba.modules.provider.dto.ProviderUpdateDto;
import com.waad.tba.modules.provider.dto.ProviderViewDto;
import com.waad.tba.modules.provider.entity.Provider;
import com.waad.tba.modules.provider.entity.ProviderAllowedEmployer;
import com.waad.tba.modules.provider.mapper.ProviderMapper;
import com.waad.tba.modules.provider.repository.ProviderDocumentRepository;
import com.waad.tba.modules.provider.repository.ProviderRepository;
import com.waad.tba.modules.provider.repository.ProviderAllowedEmployerRepository;
import com.waad.tba.modules.providercontract.entity.ProviderContract;
import com.waad.tba.modules.providercontract.entity.ProviderContract.ContractStatus;
import com.waad.tba.modules.providercontract.entity.ProviderContract.PricingModel;
import com.waad.tba.modules.providercontract.entity.ProviderContract.PricingModel;
import com.waad.tba.modules.providercontract.repository.ProviderContractRepository;
import com.waad.tba.modules.rbac.entity.User;
import com.waad.tba.modules.rbac.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class ProviderService {

    private final ProviderRepository providerRepository;
    private final ProviderDocumentRepository providerDocumentRepository;
    private final ProviderMapper providerMapper;
    private final ProviderContractRepository providerContractRepository;
    private final OrganizationRepository organizationRepository;
    private final ProviderAllowedEmployerRepository providerAllowedEmployerRepository;
    private final UserRepository userRepository;

    public List<ProviderSelectorDto> getSelectorOptions() {
        return providerRepository.findAllActive().stream()
                .map(providerMapper::toSelectorDto)
                .collect(Collectors.toList());
    }

    public List<ProviderViewDto> search(String query) {
        return providerRepository.search(query).stream()
                .map(p -> providerMapper.toViewDto(p, providerDocumentRepository.existsByProviderIdAndActiveTrue(p.getId())))
                .collect(Collectors.toList());
    }

    public ProviderViewDto createProvider(ProviderCreateDto dto) {
        if (providerRepository.existsByLicenseNumber(dto.getLicenseNumber())) {
            throw new RuntimeException("Provider with license number already exists: " + dto.getLicenseNumber());
        }

        Provider provider = providerMapper.toEntity(dto);
        provider = providerRepository.save(provider);
        return providerMapper.toViewDto(provider, false);
    }

    public ProviderViewDto updateProvider(Long id, ProviderUpdateDto dto) {
        Provider provider = providerRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Provider not found with id: " + id));

        providerMapper.updateEntityFromDto(provider, dto);
        
        // Handle allowed payers synchronization (TPA Model)
        if (dto.getAllowedPayers() != null) {
            // Get current list
            List<Long> currentIds = provider.getAllowedEmployers().stream()
                    .map(pae -> pae.getEmployer().getId())
                    .collect(Collectors.toList());
            
            // Determine to add
            List<Long> toAdd = dto.getAllowedPayers().stream()
                    .filter(payerId -> !currentIds.contains(payerId))
                    .collect(Collectors.toList());
            
            // Remove unselected (orphanRemoval sets active=false or deletes. Here we delete)
            provider.getAllowedEmployers().removeIf(pae -> !dto.getAllowedPayers().contains(pae.getEmployer().getId()));
            
            // Add new
            for (Long employerId : toAdd) {
                Organization employer = organizationRepository.findById(employerId)
                        .orElseThrow(() -> new RuntimeException("Employer not found: " + employerId));
                
                provider.getAllowedEmployers().add(ProviderAllowedEmployer.builder()
                        .provider(provider)
                        .employer(employer)
                        .active(true)
                        .build());
            }
        }
        
        provider = providerRepository.save(provider);

        // Sync visibility settings to all linked users
        syncVisibilityToUsers(provider, userRepository.findByProviderId(provider.getId()));

        return providerMapper.toViewDto(provider, providerDocumentRepository.existsByProviderIdAndActiveTrue(id));
    }



    @Transactional(readOnly = true)
    public List<AllowedEmployerDto> getAllowedEmployers(Long providerId) {
        Provider provider = providerRepository.findById(providerId)
                .orElseThrow(() -> new RuntimeException("Provider not found with id: " + providerId));
            
        Set<AllowedEmployerDto> distinctEmployers = new HashSet<>();

        // 1. Add Global Network if enabled
        if (Boolean.TRUE.equals(provider.getAllowAllEmployers())) {
             distinctEmployers.add(AllowedEmployerDto.builder()
                .id(-1L) 
                .name("الشبكة العامة") 
                .nameEn("Global Network")
                .isGlobal(true)
                .isActive(true)
                .build());
        }

        // 2. Add TPA Model Employers (The "Allowed" List)
        if (provider.getAllowedEmployers() != null) {
            provider.getAllowedEmployers().stream()
                .filter(pae -> Boolean.TRUE.equals(pae.getActive()) && pae.getEmployer() != null)
                .forEach(pae -> {
                    distinctEmployers.add(AllowedEmployerDto.builder()
                        .id(pae.getEmployer().getId())
                        .name(pae.getEmployer().getName())
                        .nameEn(pae.getEmployer().getName()) 
                        .isGlobal(false)
                        .isActive(true)
                        .build());
                });
        }

        // 3. Add Contract Model Employers (The "Contracted" List) checking for duplicates
        List<ProviderContract> activeContracts = providerContractRepository
            .findByProviderIdAndStatusAndActiveTrue(providerId, ContractStatus.ACTIVE);
            
        activeContracts.stream()
            .filter(c -> c.getEmployer() != null)
            .forEach(contract -> {
                distinctEmployers.add(AllowedEmployerDto.builder()
                    .id(contract.getEmployer().getId())
                    .name(contract.getEmployer().getName())
                    .nameEn(contract.getEmployer().getName())
                    .isGlobal(false)
                    .isActive(true)
                    .build());
            });

        // 4. Return sorted list
        return distinctEmployers.stream()
            .sorted((a, b) -> {
                if (Boolean.TRUE.equals(a.getIsGlobal())) return -1;
                if (Boolean.TRUE.equals(b.getIsGlobal())) return 1;
                return a.getName().compareTo(b.getName());
            })
            .collect(Collectors.toList());
    }



    @Transactional(readOnly = true)
    public ProviderViewDto getProvider(Long id) {
        Provider provider = providerRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Provider not found with id: " + id));
        return providerMapper.toViewDto(provider, providerDocumentRepository.existsByProviderIdAndActiveTrue(id));
    }

    @Transactional(readOnly = true)
    public Page<ProviderViewDto> listProviders(int page, int size, String search) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<Provider> providers;
        
        if (search != null && !search.isEmpty()) {
            // Search ALL providers (active AND inactive)
            providers = providerRepository.searchPagedAll(search, pageable);
        } else {
            // Return ALL providers (active AND inactive)  
            providers = providerRepository.findAll(pageable);
        }
        
        return providers.map(p -> providerMapper.toViewDto(p, providerDocumentRepository.existsByProviderIdAndActiveTrue(p.getId())));
    }

    public void deleteProvider(Long id) {
        Provider provider = providerRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Provider not found with id: " + id));
        provider.setActive(false);
        providerRepository.save(provider);
    }

    @Transactional(readOnly = true)
    public List<ProviderViewDto> getAllActiveProviders() {
        return providerRepository.findAllActive().stream()
                .map(p -> providerMapper.toViewDto(p, providerDocumentRepository.existsByProviderIdAndActiveTrue(p.getId())))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public long countProviders() {
        return providerRepository.countActive();
    }

    @Transactional(readOnly = true)
    public List<Long> getAllowedEmployerIds(Long providerId) {
        return getAllowedEmployers(providerId).stream()
                .map(AllowedEmployerDto::getId)
                .filter(id -> id > 0)
                .collect(Collectors.toList());
    }

    public void syncUserWithProvider(User user) {
        if (user == null || user.getProviderId() == null) return;
        providerRepository.findById(user.getProviderId()).ifPresent(provider -> 
            syncVisibilityToUsers(provider, java.util.Collections.singletonList(user))
        );
    }

    public void clearProviderSettingsForUser(User user) {
        if (user == null) return;
        log.info("🚿 Clearing provider visibility settings for user {}", user.getUsername());
        user.setAllowAllCompanies(true);
        user.getPermittedOrganizations().clear();
        userRepository.save(user);
    }

    private void syncVisibilityToUsers(Provider provider, List<User> usersToSync) {
        if (usersToSync == null || usersToSync.isEmpty()) {
            log.debug("No users to sync for provider {}", provider.getId());
            return;
        }

        log.info("🔄 Syncing visibility settings from provider {} to {} users", provider.getId(), usersToSync.size());

        Set<Organization> permittedOrgs = provider.getAllowedEmployers().stream()
                .filter(pae -> Boolean.TRUE.equals(pae.getActive()) && pae.getEmployer() != null)
                .map(ProviderAllowedEmployer::getEmployer)
                .collect(Collectors.toSet());

        for (User user : usersToSync) {
            log.debug("Syncing user {}: allowAll={}, permittedCount={}", 
                user.getUsername(), provider.getAllowAllEmployers(), permittedOrgs.size());
            user.setAllowAllCompanies(provider.getAllowAllEmployers());
            
            // Critical: Update the ManyToMany collection
            user.getPermittedOrganizations().clear();
            if (Boolean.FALSE.equals(provider.getAllowAllEmployers())) {
                user.getPermittedOrganizations().addAll(permittedOrgs);
            }
            userRepository.save(user);
        }
    }

    /**
     * Sync Provider settings FROM a User (reverse sync).
     * Called when User's visibility settings are manually changed.
     * 
     * This ensures bidirectional synchronization:
     * - Updates Provider.allowAllEmployers based on User.allowAllCompanies
     * - Updates Provider.allowedEmployers based on User.permittedOrganizations
     * - Broadcasts changes to all other users linked to this provider
     * 
     * @param user The user whose settings should be synced to the provider
     */
    @Transactional
    public void syncProviderFromUser(User user) {
        if (user == null || user.getProviderId() == null) {
            log.warn("⚠️ Cannot sync provider from user: user or providerId is null");
            return;
        }
        
        Provider provider = providerRepository.findById(user.getProviderId())
            .orElseThrow(() -> new RuntimeException("Provider not found: " + user.getProviderId()));
        
        log.info("🔄 Reverse Sync: Updating Provider {} FROM User {}", provider.getId(), user.getUsername());
        
        // Update Provider's allowAllEmployers flag
        provider.setAllowAllEmployers(user.getAllowAllCompanies());
        
        // Update Provider's allowedEmployers list
        provider.getAllowedEmployers().clear();
        
        if (Boolean.FALSE.equals(user.getAllowAllCompanies())) {
            for (Organization org : user.getPermittedOrganizations()) {
                ProviderAllowedEmployer pae = ProviderAllowedEmployer.builder()
                    .provider(provider)
                    .employer(org)
                    .active(true)
                    .build();
                provider.getAllowedEmployers().add(pae);
            }
            log.debug("Added {} allowed employers to provider", user.getPermittedOrganizations().size());
        }
        
        providerRepository.save(provider);
        
        // Sync back to ALL other users linked to this provider (excluding the current user to avoid loops)
        List<User> otherUsers = userRepository.findByProviderId(provider.getId())
            .stream()
            .filter(u -> !u.getId().equals(user.getId()))
            .collect(Collectors.toList());
        
        if (!otherUsers.isEmpty()) {
            log.info("📢 Broadcasting changes to {} other users linked to provider {}", 
                otherUsers.size(), provider.getId());
            syncVisibilityToUsers(provider, otherUsers);
        } else {
            log.debug("No other users to sync for provider {}", provider.getId());
        }
    }
}
