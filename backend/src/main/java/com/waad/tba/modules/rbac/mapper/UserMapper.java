package com.waad.tba.modules.rbac.mapper;

import com.waad.tba.modules.rbac.dto.*;
import com.waad.tba.modules.rbac.entity.User;
import com.waad.tba.modules.provider.repository.ProviderRepository;
import com.waad.tba.common.repository.OrganizationRepository;
import org.springframework.stereotype.Component;

import java.util.stream.Collectors;

@Component
public class UserMapper {

    private final RoleMapper roleMapper;
    private final ProviderRepository providerRepository;
    private final OrganizationRepository organizationRepository;

    public UserMapper(RoleMapper roleMapper, ProviderRepository providerRepository, OrganizationRepository organizationRepository) {
        this.roleMapper = roleMapper;
        this.providerRepository = providerRepository;
        this.organizationRepository = organizationRepository;
    }

    public UserResponseDto toResponseDto(User user) {
        if (user == null) return null;
        
        return UserResponseDto.builder()
                .id(user.getId())
                .username(user.getUsername())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .active(user.getActive())
                .roles(user.getRoles() != null ? 
                       user.getRoles().stream()
                           .map(roleMapper::toResponseDto)
                           .collect(Collectors.toList()) : null)
                // Employer/Provider associations
                .employerId(user.getEmployerId())
                .employerName(user.getEmployerId() != null ? 
                    organizationRepository.findById(user.getEmployerId())
                        .map(com.waad.tba.common.entity.Organization::getName).orElse(null) : null)
                .providerId(user.getProviderId())
                .providerName(user.getProviderId() != null ? 
                    providerRepository.findById(user.getProviderId())
                        .map(com.waad.tba.modules.provider.entity.Provider::getName).orElse(null) : null)

                // Provider specific permissions
                .allowAllCompanies(user.getAllowAllCompanies())
                .permittedCompanies(user.getPermittedOrganizations() != null ?
                        user.getPermittedOrganizations().stream()
                                .map(this::toEmployerResponseDto)
                                .collect(Collectors.toSet()) : null)
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .build();
    }

    private UserEmployerResponseDto toEmployerResponseDto(com.waad.tba.common.entity.Organization org) {
        if (org == null) return null;
        return UserEmployerResponseDto.builder()
                .id(org.getId())
                .name(org.getName()) // Use unified name field
                .nameAr(org.getName())
                .code(org.getCode())
                .build();
    }

    public User toEntity(UserCreateDto dto) {
        if (dto == null) return null;
        
        return User.builder()
                .username(dto.getUsername())
                .password(dto.getPassword()) // Will be encoded by service
                .fullName(dto.getFullName())
                .email(dto.getEmail())
                .phone(dto.getPhone())
                .active(true)
                // Employer/Provider associations (2026-01-16)
                .employerId(dto.getEmployerId())
                .providerId(dto.getProviderId())

                .allowAllCompanies(dto.getAllowAllCompanies() != null ? dto.getAllowAllCompanies() : true)
                .build();
    }

    public void updateEntityFromDto(User user, UserUpdateDto dto) {
        if (dto == null) return;
        
        user.setFullName(dto.getFullName());
        user.setEmail(dto.getEmail());
        user.setPhone(dto.getPhone());
        if (dto.getActive() != null) {
            user.setActive(dto.getActive());
        }
        // Employer/Provider associations (2026-01-16)
        // Fix: Allow setting to null (for unlinking)
        user.setEmployerId(dto.getEmployerId());
        user.setProviderId(dto.getProviderId());
        
        if (dto.getAllowAllCompanies() != null) {
            user.setAllowAllCompanies(dto.getAllowAllCompanies());
        }
    }
}
