package com.waad.tba.modules.rbac.service.impl;

import com.waad.tba.common.exception.ResourceNotFoundException;
import com.waad.tba.modules.rbac.dto.PermissionCreateDto;
import com.waad.tba.modules.rbac.dto.PermissionResponseDto;
import com.waad.tba.modules.rbac.entity.Permission;
import com.waad.tba.modules.rbac.mapper.PermissionMapper;
import com.waad.tba.modules.rbac.repository.PermissionRepository;
import com.waad.tba.modules.rbac.service.PermissionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * تنفيذ خدمة الصلاحيات (Permission Service Implementation).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PermissionServiceImpl implements PermissionService {

    private final PermissionRepository permissionRepository;
    private final PermissionMapper permissionMapper;

    @Override
    @Transactional(readOnly = true)
    public List<PermissionResponseDto> findAll() {
        log.debug("Finding all permissions");
        return permissionRepository.findAll().stream()
                .map(permissionMapper::toResponseDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public PermissionResponseDto findById(Long id) {
        log.debug("Finding permission by id: {}", id);
        Permission permission = permissionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Permission", "id", id));
        return permissionMapper.toResponseDto(permission);
    }

    @Override
    @Transactional
    public PermissionResponseDto create(PermissionCreateDto dto) {
        log.info("Creating new permission: {}", dto.getName());
        
        if (permissionRepository.existsByName(dto.getName())) {
            throw new IllegalArgumentException("Permission name already exists");
        }

        Permission permission = permissionMapper.toEntity(dto);
        Permission savedPermission = permissionRepository.save(permission);
        
        log.info("Permission created successfully with id: {}", savedPermission.getId());
        return permissionMapper.toResponseDto(savedPermission);
    }

    @Override
    @Transactional
    public PermissionResponseDto update(Long id, PermissionCreateDto dto) {
        log.info("Updating permission with id: {}", id);
        
        Permission permission = permissionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Permission", "id", id));

        if (!permission.getName().equals(dto.getName()) && permissionRepository.existsByName(dto.getName())) {
            throw new IllegalArgumentException("Permission name already exists");
        }

        permissionMapper.updateEntityFromDto(permission, dto);
        Permission updatedPermission = permissionRepository.save(permission);
        
        log.info("Permission updated successfully: {}", id);
        return permissionMapper.toResponseDto(updatedPermission);
    }

    @Override
    @Transactional
    public void delete(Long id) {
        log.info("Deleting permission with id: {}", id);
        
        if (!permissionRepository.existsById(id)) {
            throw new ResourceNotFoundException("Permission", "id", id);
        }
        
        permissionRepository.deleteById(id);
        log.info("Permission deleted successfully: {}", id);
    }

    @Override
    @Transactional(readOnly = true)
    public List<PermissionResponseDto> search(String query) {
        log.debug("Searching permissions with query: {}", query);
        return permissionRepository.searchPermissions(query).stream()
                .map(permissionMapper::toResponseDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public Page<PermissionResponseDto> findAllPaginated(Pageable pageable) {
        log.debug("Finding permissions with pagination");
        return permissionRepository.findAll(pageable)
                .map(permissionMapper::toResponseDto);
    }
}
