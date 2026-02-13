package com.waad.tba.modules.provider.repository;

import com.waad.tba.modules.provider.entity.ProviderAllowedEmployer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProviderAllowedEmployerRepository extends JpaRepository<ProviderAllowedEmployer, Long> {
    
    List<ProviderAllowedEmployer> findByProviderId(Long providerId);
    
    List<ProviderAllowedEmployer> findByProviderIdAndActiveTrue(Long providerId);
    
    Optional<ProviderAllowedEmployer> findByProviderIdAndEmployerId(Long providerId, Long employerId);
    
    void deleteByProviderId(Long providerId);
}
