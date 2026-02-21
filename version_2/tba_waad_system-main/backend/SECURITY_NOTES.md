# 🔐 Security Configuration Notes

## Overview

This document explains the security architecture and secrets management policy for the TBA WAAD System.

---

## Authentication Architecture

### Web Application → **Session-Based Authentication**

| Property | Value |
|----------|-------|
| Cookie Name | `JSESSIONID` |
| HTTP Only | `true` (prevents XSS) |
| Same-Site | `strict` (prevents CSRF) |
| Secure | `false` (DEV) / `true` (PROD) |
| Timeout | 30 minutes |

**Flow:**
1. User submits credentials to `/api/auth/login`
2. Server validates and creates HTTP session
3. Session ID stored in `JSESSIONID` cookie
4. All subsequent requests include cookie automatically
5. Session expires after 30 min inactivity

### Mobile Application → **JWT Authentication (Future)**

| Property | Value |
|----------|-------|
| Token Type | Bearer JWT |
| Algorithm | HS256/HS512 |
| Expiration | 24 hours |
| Status | **Reserved for future mobile clients** |

**Note:** JWT beans exist in the codebase but are NOT wired to web security. They will be activated when mobile API development begins.

---

## Required Environment Variables

### 🔴 Required (Startup will fail if missing)

| Variable | Description | Example |
|----------|-------------|---------|
| `DB_PASSWORD` | PostgreSQL database password | `mySecureDbPassword123` |
| `JWT_SECRET` | JWT signing key (min 32 bytes, Base64) | `$(openssl rand -base64 48)` |

### 🟡 Conditionally Required

| Variable | Condition | Description |
|----------|-----------|-------------|
| `EMAIL_USERNAME` | If `EMAIL_ENABLED=true` (default) | SMTP username |
| `EMAIL_PASSWORD` | If `EMAIL_ENABLED=true` (default) | SMTP password |

> **Note:** Email credentials have empty defaults in YAML to allow Spring to start. The `StartupSecurityValidator` validates credentials when `EMAIL_ENABLED=true`.

### 🟢 Optional (with defaults)

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_URL` | `jdbc:postgresql://localhost:5432/tba_waad_system` | Database URL |
| `DB_USERNAME` | `postgres` | Database username |
| `EMAIL_HOST` | `smtp.hostinger.com` | SMTP server |
| `EMAIL_PORT` | `587` | SMTP port |
| `EMAIL_ENABLED` | `true` | Enable email features |
| `SESSION_COOKIE_SECURE` | `false` | Cookie secure flag |
| `LOG_LEVEL_APP` | `DEBUG` | App log level |
| `LOG_LEVEL_SECURITY` | `INFO` | Security log level |

---

## Secrets Policy

### ❌ NEVER Do This

```yaml
# BAD - Hardcoded secrets in config files
spring:
  datasource:
    password: 12345
  mail:
    password: actualPassword123
jwt:
  secret: VGhpcy1pcy1hLXNlY3JldA==
```

### ✅ Always Do This

```yaml
# GOOD - Environment variable references without defaults
spring:
  datasource:
    password: ${DB_PASSWORD}
  mail:
    password: ${EMAIL_PASSWORD}
jwt:
  secret: ${JWT_SECRET}
```

### Generating Secure Secrets

```bash
# Generate JWT secret (48 bytes = 384 bits, Base64 encoded)
export JWT_SECRET=$(openssl rand -base64 48)

# Generate secure database password
export DB_PASSWORD=$(openssl rand -base64 24)
```

---

## Development Setup

Create a `.env` file (⚠️ NEVER commit to Git):

```bash
# .env - Development environment variables
DB_PASSWORD=localDevPassword123
JWT_SECRET=YourBase64EncodedSecretAtLeast32BytesLong==
EMAIL_ENABLED=false
```

Load before running:

```bash
# Option 1: Source the file
source .env && ./mvnw spring-boot:run

# Option 2: Export individually
export DB_PASSWORD=localDevPassword123
export JWT_SECRET=$(openssl rand -base64 48)
export EMAIL_ENABLED=false
./mvnw spring-boot:run
```

---

## Production Checklist

- [ ] `DB_PASSWORD` set via secure secrets manager
- [ ] `JWT_SECRET` generated with `openssl rand -base64 48`
- [ ] `EMAIL_USERNAME` and `EMAIL_PASSWORD` configured
- [ ] `SESSION_COOKIE_SECURE=true` (HTTPS required)
- [ ] `LOG_LEVEL_SECURITY=WARN` (reduce log noise)
- [ ] SSL/TLS configured on reverse proxy
- [ ] Database credentials rotated periodically

---

## Startup Validation

The `StartupSecurityValidator` class checks all required environment variables on startup:

```
🔐 [SECURITY] Starting security configuration validation...
✅ [SECURITY] Database password configured
✅ [SECURITY] JWT secret configured (48 bytes) - reserved for mobile clients
✅ [SECURITY] Email credentials configured
🔐 [SECURITY] All security configurations validated successfully!
```

If any required variable is missing:

```
❌ [SECURITY] Security configuration validation FAILED!
═══════════════════════════════════════════════════════════════
  1. DB_PASSWORD environment variable is required but not set
  2. JWT_SECRET environment variable is required but not set
═══════════════════════════════════════════════════════════════

💡 SOLUTION: Set the required environment variables:
   export DB_PASSWORD=your_database_password
   export JWT_SECRET=$(openssl rand -base64 48)
```

---

## File Locations

| File | Purpose |
|------|---------|
| `application.yml` | Main config (no secrets) |
| `StartupSecurityValidator.java` | Startup validation |
| `SECURITY_NOTES.md` | This document |

---

*Last Updated: 2026-01-28*
*Author: TBA Security Team*
