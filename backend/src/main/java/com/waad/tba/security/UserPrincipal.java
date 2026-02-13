package com.waad.tba.security;

import com.waad.tba.modules.rbac.entity.User;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Custom UserPrincipal to hold user details including ID and organizational context.
 */
@Data
@AllArgsConstructor
@Builder
public class UserPrincipal implements UserDetails {
    private Long id;
    private String username;
    private String password;
    private String email;
    private Long employerId;
    private Long companyId;
    private Collection<? extends GrantedAuthority> authorities;

    public static UserPrincipal create(User user, Collection<? extends GrantedAuthority> authorities) {
        return UserPrincipal.builder()
                .id(user.getId())
                .username(user.getUsername())
                .password(user.getPassword())
                .email(user.getEmail())
                .employerId(user.getEmployerId())
                .companyId(user.getCompanyId())
                .authorities(authorities)
                .build();
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return authorities;
    }

    @Override
    public String getPassword() {
        return password;
    }

    @Override
    public String getUsername() {
        return username;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return true;
    }
}
