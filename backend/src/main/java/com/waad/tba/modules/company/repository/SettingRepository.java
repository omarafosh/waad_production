package com.waad.tba.modules.company.repository;

import com.waad.tba.modules.company.entity.Setting;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface SettingRepository extends JpaRepository<Setting, Long> {
    Optional<Setting> findBySystemCode(String systemCode);
    boolean existsBySystemCode(String systemCode);
}
