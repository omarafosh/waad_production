package com.waad.tba.modules.company.service;

import com.waad.tba.modules.company.dto.CompanyDto;
import com.waad.tba.modules.company.entity.Company;
import com.waad.tba.modules.company.mapper.CompanyMapper;
import com.waad.tba.modules.company.repository.CompanyRepository;
import com.waad.tba.common.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Deprecated
@Service
@RequiredArgsConstructor
@Slf4j
public class CompanyService {


    private final CompanyRepository companyRepository;
    private final CompanyMapper companyMapper;


    /**
     * Create a new company
     */
    @Transactional
    public CompanyDto createCompany(CompanyDto companyDto) {
        log.info("Creating new company: {}", companyDto.getName());

        // Check if code already exists
        if (companyRepository.existsByCode(companyDto.getCode())) {
            log.warn("Attempt to create company with duplicate code: {}", companyDto.getCode());
            throw new IllegalArgumentException("Company with code '" + companyDto.getCode() + "' already exists");
        }

        Company company = companyMapper.toEntity(companyDto);
        Company savedCompany = companyRepository.save(company);

        log.info("Company created with ID: {}", savedCompany.getId());
        return companyMapper.toDto(savedCompany);
    }

    /**
     * Update an existing company
     */
    @Transactional
    public CompanyDto updateCompany(Long id, CompanyDto companyDto) {
        log.info("Updating company with ID: {}", id);

        Company company = companyRepository.findById(id)
                .orElseThrow(() -> {
                    log.error("Company not found with ID: {}", id);
                    return new ResourceNotFoundException("Company not found with ID: " + id);
                });

        // Check if code is being changed and if new code already exists
        if (!company.getCode().equals(companyDto.getCode()) &&
            companyRepository.existsByCode(companyDto.getCode())) {
            log.warn("Attempt to update company {} with duplicate code: {}", id, companyDto.getCode());
            throw new IllegalArgumentException("Company with code '" + companyDto.getCode() + "' already exists");
        }

        companyMapper.updateEntityFromDto(companyDto, company);
        Company updatedCompany = companyRepository.save(company);

        log.info("Company updated: {}", updatedCompany.getId());
        return companyMapper.toDto(updatedCompany);
    }

    /**
     * Get company by ID
     */
    @Transactional(readOnly = true)
    public CompanyDto getCompany(Long id) {
        log.info("Fetching company with ID: {}", id);

        Company company = companyRepository.findById(id)
                .orElseThrow(() -> {
                    log.error("Company not found with ID: {}", id);
                    return new ResourceNotFoundException("Company not found with ID: " + id);
                });

        log.debug("Successfully fetched company: {} (code: {})", company.getName(), company.getCode());
        return companyMapper.toDto(company);
    }

    /**
     * Get company by code
     */
    @Transactional(readOnly = true)
    public CompanyDto getCompanyByCode(String code) {
        log.info("Fetching company with code: {}", code);

        Company company = companyRepository.findByCode(code)
                .orElseThrow(() -> {
                    log.error("Company not found with code: {}", code);
                    return new ResourceNotFoundException("Company not found with code: " + code);
                });

        log.debug("Successfully fetched company: {} (ID: {})", company.getName(), company.getId());
        return companyMapper.toDto(company);
    }

    /**
     * Get the default company for single-company mode.
     * 
     * This method implements the following fallback strategy:
     * 1. Return company where is_default = true
     * 2. If none found, return first active company
     * 3. If none found, return first company
     * 4. If no companies exist, throw IllegalStateException
     * 
     * This ensures the system always has a company context and never
     * returns 404 for normal operations.
     * 
     * @return CompanyDto The default company
     * @throws IllegalStateException if no companies exist (configuration error)
     */
    @Transactional(readOnly = true)
    public CompanyDto getDefaultCompany() {
        log.info("Fetching default company for single-company context");

        // Strategy 1: Try to find company with is_default = true
        Optional<Company> defaultCompany = companyRepository.findByIsDefaultTrue();
        if (defaultCompany.isPresent()) {
            Company company = defaultCompany.get();
            log.debug("Found default company: {} (ID: {})", company.getName(), company.getId());
            return companyMapper.toDto(company);
        }

        log.warn("No company marked as default. Falling back to first active company.");

        // Strategy 2: Get first active company
        List<Company> companies = companyRepository.findAll();
        Optional<Company> firstActive = companies.stream()
                .filter(Company::getActive)
                .findFirst();
        
        if (firstActive.isPresent()) {
            Company company = firstActive.get();
            log.warn("Using first active company as default: {} (ID: {}). " +
                    "Consider marking it as default in database.", company.getName(), company.getId());
            return companyMapper.toDto(company);
        }

        log.warn("No active companies found. Falling back to any company.");

        // Strategy 3: Get any company
        Optional<Company> anyCompany = companies.stream().findFirst();
        if (anyCompany.isPresent()) {
            Company company = anyCompany.get();
            log.warn("Using first available company as default: {} (ID: {}). " +
                    "Company is inactive! Check configuration.", company.getName(), company.getId());
            return companyMapper.toDto(company);
        }

        // No companies at all - return null (will be handled by getOrCreateDefaultCompany)
        log.warn("No companies found in database.");
        return null;
    }

    /**
     * Get the default company or create one if none exists
     * This ensures the system always has a company to work with.
     * 
     * @return CompanyDto (existing or newly created)
     */
    @Transactional
    public CompanyDto getOrCreateDefaultCompany() {
        log.info("Getting or creating default company");
        
        CompanyDto existing = getDefaultCompany();
        if (existing != null) {
            return existing;
        }
        
        // Create default company
        log.info("No company found, creating default company");
        Company defaultCompany = Company.builder()
                .name("شركة TBA للمراجعة الطبية")
                .code("TBA")
                .active(true)
                .isDefault(true)
                .build();
        
        Company saved = companyRepository.save(defaultCompany);
        log.info("Default company created with ID: {}", saved.getId());
        
        return companyMapper.toDto(saved);
    }

    /**
     * Update the default company (or create if not exists)
     * For single-tenant mode, this updates the only company in the system.
     * 
     * @param companyDto Company data to update
     * @return Updated CompanyDto
     */
    @Transactional
    public CompanyDto updateDefaultCompany(CompanyDto companyDto) {
        log.info("Updating default company");
        
        // Find the default company
        Company company = companyRepository.findByIsDefaultTrue()
                .or(() -> {
                    List<Company> companies = companyRepository.findAll();
                    return companies.stream()
                            .filter(Company::getActive)
                            .findFirst();
                })
                .or(() -> {
                    List<Company> companies = companyRepository.findAll();
                    return companies.stream().findFirst();
                })
                .orElse(null);
        
        if (company == null) {
            // Create new company
            log.info("No company exists, creating new one");
            Company newCompany = companyMapper.toEntity(companyDto);
            newCompany.setIsDefault(true);
            Company saved = companyRepository.save(newCompany);
            return companyMapper.toDto(saved);
        }
        
        // Update existing company
        companyMapper.updateEntityFromDto(companyDto, company);
        Company updated = companyRepository.save(company);
        
        /* Sync logic removed - SystemSettings table is deprecated
        // Sync with SystemSettings table
        log.info("Synchronizing company updates with system_settings table");
        try {
           ...
        } catch (Exception e) {
            log.error("Failed to sync company updates with system_settings table: {}", e.getMessage());
        }
        */
        
        log.info("Default company updated: {}", updated.getId());
        return companyMapper.toDto(updated);
    }

    /**
     * Helper to sync a single system setting safely
     * REMOVED
     */
    /*
    private void syncSystemSetting(String key, String value, String updatedBy) {
        try {
            systemSettingsService.updateSetting(key, value, updatedBy);
            log.debug("Synced system setting: {} = {}", key, value);
        } catch (IllegalArgumentException e) {
            log.warn("System setting key not found, skipping sync: {}", key);
        }
    }
    */

    /**
     * Get all companies
     */
    @Transactional(readOnly = true)
    public List<CompanyDto> getAllCompanies() {
        log.info("Fetching all companies");

        return companyRepository.findAll().stream()
                .map(companyMapper::toDto)
                .collect(Collectors.toList());
    }

    /**
     * Activate a company
     */
    @Transactional
    public CompanyDto activateCompany(Long id) {
        log.info("Activating company with ID: {}", id);

        Company company = companyRepository.findById(id)
                .orElseThrow(() -> {
                    log.error("Company not found with ID: {}", id);
                    return new ResourceNotFoundException("Company not found with ID: " + id);
                });

        company.setActive(true);
        Company updatedCompany = companyRepository.save(company);

        log.info("Company activated: {}", updatedCompany.getId());
        return companyMapper.toDto(updatedCompany);
    }

    /**
     * Deactivate a company
     */
    @Transactional
    public CompanyDto deactivateCompany(Long id) {
        log.info("Deactivating company with ID: {}", id);

        Company company = companyRepository.findById(id)
                .orElseThrow(() -> {
                    log.error("Company not found with ID: {}", id);
                    return new ResourceNotFoundException("Company not found with ID: " + id);
                });

        company.setActive(false);
        Company updatedCompany = companyRepository.save(company);

        log.info("Company deactivated: {}", updatedCompany.getId());
        return companyMapper.toDto(updatedCompany);
    }

    /**
     * Delete a company
     */
    @Transactional
    public void deleteCompany(Long id) {
        log.info("Deleting company with ID: {}", id);

        Company company = companyRepository.findById(id)
                .orElseThrow(() -> {
                    log.error("Company not found with ID: {}", id);
                    return new ResourceNotFoundException("Company not found with ID: " + id);
                });

        companyRepository.delete(company);
        log.info("Company deleted: {}", id);
    }
}
