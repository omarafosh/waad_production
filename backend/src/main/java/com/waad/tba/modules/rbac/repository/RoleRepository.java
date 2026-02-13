package com.waad.tba.modules.rbac.repository;

import com.waad.tba.modules.rbac.entity.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RoleRepository extends JpaRepository<Role, Long> {
    Optional<Role> findByName(String name);
    
    /**
     * Find role by name with permissions eagerly fetched.
     * Prevents lazy loading issues in SuperAdminPermissionSynchronizer.
     * 
     * @param name Role name
     * @return Role with permissions loaded
     */
    @Query("SELECT r FROM Role r LEFT JOIN FETCH r.permissions WHERE r.name = :name")
    Optional<Role> findByNameWithPermissions(String name);
    
    Boolean existsByName(String name);
    
    @Query("SELECT r FROM Role r WHERE " +
           "LOWER(r.name) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(r.description) LIKE LOWER(CONCAT('%', :query, '%'))")
    List<Role> searchRoles(String query);
}
