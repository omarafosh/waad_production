package com.waad.tba.common.lifecycle.repository;

import com.waad.tba.common.lifecycle.entity.LifecycleReasonCode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LifecycleReasonCodeRepository extends JpaRepository<LifecycleReasonCode, Integer> {

    List<LifecycleReasonCode> findAllByActiveTrue();

    @Query(value = "SELECT * FROM lifecycle_reason_codes " +
                   "WHERE active = true " +
                   "AND :entityType = ANY(applicable_entities) " +
                   "AND :action = ANY(applicable_actions)", nativeQuery = true)
    List<LifecycleReasonCode> findApplicableReasons(
            @Param("entityType") String entityType, 
            @Param("action") String action);
}
