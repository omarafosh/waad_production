package com.waad.tba.modules.reviewer.service;

import com.waad.tba.common.entity.Organization;
import com.waad.tba.common.exception.ResourceNotFoundException;
import com.waad.tba.common.repository.OrganizationRepository;
import com.waad.tba.modules.reviewer.dto.ReviewerCompanyCreateDto;
import com.waad.tba.modules.reviewer.dto.ReviewerCompanyResponseDto;
import com.waad.tba.modules.reviewer.dto.ReviewerCompanySelectorDto;
import com.waad.tba.modules.reviewer.mapper.ReviewerCompanyMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Reviewer Company Service (Unified Organization-backed implementation).
 *
 * Reads and writes reviewer companies through {@link OrganizationRepository}
 * only.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ReviewerCompanyService {

    private final OrganizationRepository organizationRepository;
    private final ReviewerCompanyMapper mapper;

    public List<ReviewerCompanySelectorDto> getSelectorOptions() {
        return organizationRepository.findByActiveTrue().stream()
                .map(mapper::toSelectorDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ReviewerCompanyResponseDto> findAll() {
        log.debug("Finding all reviewer companies");
        return organizationRepository.findByActiveTrue().stream()
                .map(mapper::toResponseDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ReviewerCompanyResponseDto findById(Long id) {
        log.debug("Finding reviewer company by id: {}", id);
        Organization entity = organizationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ReviewerCompany", "id", id));
        return mapper.toResponseDto(entity);
    }

    @Transactional
    public ReviewerCompanyResponseDto create(ReviewerCompanyCreateDto dto) {
        log.info("Creating new reviewer company: {}", dto.getName());

        Organization entity = mapper.toEntity(dto);
        entity.setActive(true);
        Organization saved = organizationRepository.save(entity);

        log.info("Reviewer company created successfully with id: {}", saved.getId());
        return mapper.toResponseDto(saved);
    }

    @Transactional
    public ReviewerCompanyResponseDto update(Long id, ReviewerCompanyCreateDto dto) {
        log.info("Updating reviewer company with id: {}", id);

        Organization entity = organizationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ReviewerCompany", "id", id));

        mapper.updateEntityFromDto(entity, dto);
        Organization updated = organizationRepository.save(entity);

        log.info("Reviewer company updated successfully: {}", id);
        return mapper.toResponseDto(updated);
    }

    @Transactional
    public void delete(Long id) {
        log.info("Soft deleting reviewer company with id: {}", id);

        Organization entity = organizationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ReviewerCompany", "id", id));

        entity.setActive(false);
        organizationRepository.save(entity);
        log.info("Reviewer company deleted successfully: {}", id);
    }

    @Transactional(readOnly = true)
    public List<ReviewerCompanyResponseDto> search(String query) {
        log.debug("Searching reviewer companies with query: {}", query);
        return organizationRepository.searchActive(query).stream()
                .map(mapper::toResponseDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Page<ReviewerCompanyResponseDto> findAllPaginated(Pageable pageable, String search) {
        log.debug("Finding reviewer companies with pagination. search={}", search);
        if (search == null || search.isBlank()) {
            return organizationRepository.findByArchivedAndActive(false, true, pageable)
                    .map(mapper::toResponseDto);
        } else {
            return organizationRepository.searchByArchivedAndActive(search, false, true, pageable)
                    .map(mapper::toResponseDto);
        }
    }

    @Transactional(readOnly = true)
    public long count() {
        return organizationRepository.count();
    }
}
