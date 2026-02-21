package com.waad.tba.modules.auth.repository;

import com.waad.tba.modules.auth.model.PasswordResetToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository("authPasswordResetTokenRepository")
public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, Long> {

    Optional<PasswordResetToken> findByEmail(String email);

    void deleteByEmail(String email);
}
