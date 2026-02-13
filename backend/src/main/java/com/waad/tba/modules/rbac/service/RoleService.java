package com.waad.tba.modules.rbac.service;

import com.waad.tba.common.exception.ResourceNotFoundException;
import com.waad.tba.modules.rbac.dto.*;
import com.waad.tba.modules.rbac.entity.Permission;
import com.waad.tba.modules.rbac.entity.Role;
import com.waad.tba.modules.rbac.mapper.RoleMapper;
import com.waad.tba.modules.rbac.repository.PermissionRepository;
import com.waad.tba.modules.rbac.repository.RoleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class RoleService {

    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;
    private final RoleMapper roleMapper;

    @Transactional(readOnly = true)
    public List<RoleResponseDto> findAll() {
        log.debug("Finding all roles");
        return roleRepository.findAll().stream()
                .map(roleMapper::toResponseDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public RoleResponseDto findById(Long id) {
        log.debug("Finding role by id: {}", id);
        Role role = roleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Role", "id", id));
        return roleMapper.toResponseDto(role);
    }

    @Transactional
    public RoleResponseDto create(RoleCreateDto dto) {
        log.info("Creating new role: {}", dto.getName());
        
        if (roleRepository.existsByName(dto.getName())) {
            throw new IllegalArgumentException("Role name already exists");
        }

        Role role = roleMapper.toEntity(dto);
        Role savedRole = roleRepository.save(role);
        
        log.info("Role created successfully with id: {}", savedRole.getId());
        return roleMapper.toResponseDto(savedRole);
    }

    @Transactional
    public RoleResponseDto update(Long id, RoleCreateDto dto) {
        log.info("Updating role with id: {}", id);
        
        Role role = roleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Role", "id", id));

        // Check name uniqueness if changed
        if (!role.getName().equals(dto.getName()) && roleRepository.existsByName(dto.getName())) {
            throw new IllegalArgumentException("Role name already exists");
        }

        roleMapper.updateEntityFromDto(role, dto);
        Role updatedRole = roleRepository.save(role);
        
        log.info("Role updated successfully: {}", id);
        return roleMapper.toResponseDto(updatedRole);
    }

    @Transactional
    public void delete(Long id) {
        log.info("Deleting role with id: {}", id);
        
        if (!roleRepository.existsById(id)) {
            throw new ResourceNotFoundException("Role", "id", id);
        }
        
        roleRepository.deleteById(id);
        log.info("Role deleted successfully: {}", id);
    }

    @Transactional(readOnly = true)
    public List<RoleResponseDto> search(String query) {
        log.debug("Searching roles with query: {}", query);
        return roleRepository.searchRoles(query).stream()
                .map(roleMapper::toResponseDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Page<RoleResponseDto> findAllPaginated(Pageable pageable) {
        log.debug("Finding roles with pagination");
        return roleRepository.findAll(pageable)
                .map(roleMapper::toResponseDto);
    }

    @Transactional
    public RoleResponseDto assignPermissions(Long roleId, AssignPermissionsDto dto) {
        log.info("Assigning permissions to role: {}", roleId);
        
        Role role = roleRepository.findById(roleId)
                .orElseThrow(() -> new ResourceNotFoundException("Role", "id", roleId));

        Set<Permission> permissions = new HashSet<>();
        for (Long permissionId : dto.getPermissionIds()) {
            Permission permission = permissionRepository.findById(permissionId)
                    .orElseThrow(() -> new ResourceNotFoundException("Permission", "id", permissionId));
            permissions.add(permission);
        }

        role.setPermissions(permissions);
        Role updatedRole = roleRepository.save(role);
        
        log.info("Permissions assigned successfully to role: {}", roleId);
        return roleMapper.toResponseDto(updatedRole);
    }
}
