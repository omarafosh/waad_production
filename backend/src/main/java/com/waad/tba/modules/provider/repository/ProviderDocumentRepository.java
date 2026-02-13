package com.waad.tba.modules.provider.repository;

import com.waad.tba.modules.provider.entity.ProviderDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProviderDocumentRepository extends JpaRepository<ProviderDocument, Long> {
    List<ProviderDocument> findByProviderIdAndActiveTrue(Long providerId);

    boolean existsByProviderIdAndActiveTrue(Long providerId);

    long countByProviderIdAndActiveTrue(Long providerId);
}
