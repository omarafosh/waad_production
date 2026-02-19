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

    @Query("SELECT r FROM LifecycleReasonCode r " +
            "WHERE r.active = true " +
            "AND UPPER(r.category) = UPPER(:action)")
    List<LifecycleReasonCode> findApplicableReasons(
            @Param("entityType") String entityType,
            @Param("action") String action);
}
