package com.waad.tba.modules.auth.entity;

import com.waad.tba.modules.rbac.entity.User;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Entity
@Table(name = "refresh_tokens")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RefreshToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String token;

    @OneToOne
    @JoinColumn(name = "users_id", referencedColumnName = "id")
    private User user;

    @Column(nullable = false)
    private Instant expiryDate;
    
    @Column(nullable = false)
    private boolean revoked;
}
