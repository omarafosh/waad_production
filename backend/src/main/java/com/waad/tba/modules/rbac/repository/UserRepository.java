package com.waad.tba.modules.rbac.repository;

import com.waad.tba.modules.rbac.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);
    Optional<User> findByEmail(String email);
    Boolean existsByUsername(String username);
    Boolean existsByEmail(String email);
    
    @Query("SELECT u FROM User u WHERE " +
           "LOWER(u.username) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(u.fullName) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(u.email) LIKE LOWER(CONCAT('%', :query, '%'))")
    List<User> searchUsers(String query);
    
    Optional<User> findByUsernameOrEmail(String username, String email);
    List<User> findByProviderId(Long providerId);

    @Query("SELECT u FROM User u JOIN u.roles r WHERE r.name = 'PROVIDER' AND u.providerId IS NULL")
    List<User> findUnassignedProviders();
}
