package com.waad.tba.modules.settlement.service;

import com.waad.tba.modules.claim.entity.Claim;
import com.waad.tba.modules.claim.entity.ClaimStatus;
import com.waad.tba.modules.claim.repository.ClaimRepository;
import com.waad.tba.modules.provider.entity.Provider;
import com.waad.tba.modules.provider.repository.ProviderRepository;
import com.waad.tba.modules.settlement.dto.AccountSummaryDTO;
import com.waad.tba.modules.settlement.dto.ProviderAccountListDTO;
import com.waad.tba.modules.settlement.entity.AccountTransaction;
import com.waad.tba.modules.settlement.entity.AccountTransaction.ReferenceType;
import com.waad.tba.modules.settlement.entity.ProviderAccount;
import com.waad.tba.modules.settlement.entity.ProviderAccount.AccountStatus;
import com.waad.tba.modules.settlement.repository.AccountTransactionRepository;
import com.waad.tba.modules.settlement.repository.ProviderAccountRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityNotFoundException;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Provider Account Service
 * 
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                    PROVIDER ACCOUNT SERVICE                                   ║
 * ║───────────────────────────────────────────────────────────────────────────────║
 * ║ Central service for managing provider financial accounts.                     ║
 * ║                                                                               ║
 * ║ FINANCIAL INTEGRITY INVARIANT:                                                ║
 * ║   running_balance = total_approved - total_paid                               ║
 * ║                                                                               ║
 * ║ ❌ NEVER modify balance directly - always through transactions                ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ProviderAccountService {

    private final ProviderAccountRepository accountRepository;
    private final AccountTransactionRepository transactionRepository;
    private final AccountTransactionService transactionService;
    private final ClaimRepository claimRepository;
    private final ProviderRepository providerRepository;

    // ═══════════════════════════════════════════════════════════════════════════
    // ACCOUNT MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Get or create a provider account.
     * If no account exists for the provider, creates one with zero balance.
     */
    @Transactional
    public ProviderAccount getOrCreateAccount(Long providerId) {
        return accountRepository.findByProviderId(providerId)
                .orElseGet(() -> {
                    log.info("Creating new provider account for provider {}", providerId);
                    ProviderAccount account = ProviderAccount.builder()
                            .providerId(providerId)
                            .runningBalance(BigDecimal.ZERO)
                            .totalApproved(BigDecimal.ZERO)
                            .totalPaid(BigDecimal.ZERO)
                            .status(AccountStatus.ACTIVE)
                            .build();
                    return accountRepository.save(account);
                });
    }

    /**
     * Get account by provider ID (with pessimistic lock for updates)
     */
    @Transactional
    public ProviderAccount getAccountForUpdate(Long providerId) {
        return accountRepository.findByProviderIdForUpdate(providerId)
                .orElseThrow(() -> new EntityNotFoundException(
                    "Provider account not found for provider: " + providerId));
    }

    /**
     * Get account by ID (read-only)
     */
    @Transactional(readOnly = true)
    public ProviderAccount getAccountById(Long accountId) {
        return accountRepository.findById(accountId)
                .orElseThrow(() -> new EntityNotFoundException(
                    "Provider account not found: " + accountId));
    }

    /**
     * Get account by provider ID (read-only)
     */
    @Transactional(readOnly = true)
    public ProviderAccount getAccountByProviderId(Long providerId) {
        return accountRepository.findByProviderId(providerId)
                .orElseThrow(() -> new EntityNotFoundException(
                    "Provider account not found for provider: " + providerId));
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // CLAIM APPROVAL - CREDIT OPERATION
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Credit the provider account when a claim is approved.
     * 
     * This is the ONLY way to increase a provider's balance.
     * 
     * @param claimId The approved claim ID
     * @param userId User performing the action
     * @return The created credit transaction
     * @throws IllegalStateException if claim is not APPROVED or already credited
     */
    @Transactional
    public AccountTransaction creditOnClaimApproval(Long claimId, Long userId) {
        // 1. Get claim and validate
        Claim claim = claimRepository.findById(claimId)
                .orElseThrow(() -> new EntityNotFoundException("Claim not found: " + claimId));
        
        // 2. Validate claim status
        if (claim.getStatus() != ClaimStatus.APPROVED) {
            throw new IllegalStateException(
                "Cannot credit for claim " + claimId + ". Status must be APPROVED, but is: " + claim.getStatus());
        }
        
        // 3. Check if already credited
        if (transactionService.existsForReference(ReferenceType.CLAIM_APPROVED, claimId)) {
            throw new IllegalStateException(
                "Claim " + claimId + " has already been credited. Cannot credit twice.");
        }
        
        // 4. Get net amount to credit
        BigDecimal amount = claim.getNetProviderAmount();
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            // Log warning for zero amount? Or throw? Source throws exception logic.
             throw new IllegalStateException(
                "Invalid credit amount for claim " + claimId + ": " + amount);
        }
        
        // 5. Get account with lock (create if not exists)
        ProviderAccount account = accountRepository.findByProviderIdForUpdate(claim.getProviderId())
                .orElseGet(() -> getOrCreateAccount(claim.getProviderId()));
        
        // 6. Validate account is active
        if (!account.isActive()) {
            throw new IllegalStateException(
                "Cannot credit inactive account for provider " + claim.getProviderId());
        }
        
        // 7. Get balance before
        BigDecimal balanceBefore = account.getRunningBalance();
        
        // 8. Credit the account
        account.credit(amount);
        accountRepository.save(account);
        
        // 9. Create transaction record
        AccountTransaction transaction = transactionService.createClaimApprovedCredit(
                account,
                claimId,
                amount,
                balanceBefore,
                userId
        );
        
        log.info("CREDIT SUCCESS: claim={}, provider={}, amount={}, newBalance={}",
                claimId, claim.getProviderId(), amount, account.getRunningBalance());
        
        return transaction;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // BATCH PAYMENT - DEBIT OPERATION
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Debit the provider account when a batch is paid.
     * 
     * This is the ONLY way to decrease a provider's balance.
     * Called internally by SettlementBatchService.
     */
    @Transactional
    public AccountTransaction debitOnBatchPayment(Long accountId, Long batchId, String batchNumber, 
                                                   BigDecimal amount, Long userId) {
        // 1. Get account with lock
        ProviderAccount account = accountRepository.findByIdForUpdate(accountId)
                .orElseThrow(() -> new EntityNotFoundException("Provider account not found: " + accountId));
        
        // 2. Validate account is active
        if (!account.isActive()) {
            throw new IllegalStateException(
                "Cannot debit inactive account: " + accountId);
        }
        
        // 3. Validate sufficient balance
        if (account.getRunningBalance().compareTo(amount) < 0) {
            throw new IllegalStateException(
                "Insufficient balance. Account: " + accountId + 
                ", Balance: " + account.getRunningBalance() + 
                ", Required: " + amount);
        }
        
        // 4. Get balance before
        BigDecimal balanceBefore = account.getRunningBalance();
        
        // 5. Debit the account
        account.debit(amount);
        accountRepository.save(account);
        
        // 6. Create transaction record
        AccountTransaction transaction = transactionService.createBatchPaidDebit(
                account,
                batchId,
                batchNumber,
                amount,
                balanceBefore,
                userId
        );
        
        log.info("DEBIT SUCCESS: batch={}, account={}, amount={}, newBalance={}",
                batchId, accountId, amount, account.getRunningBalance());
        
        return transaction;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ACCOUNT SUMMARY & REPORTING
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Get comprehensive account summary for a provider.
     */
    @Transactional(readOnly = true)
    public AccountSummaryDTO getAccountSummary(Long providerId) {
        ProviderAccount account = getAccountByProviderId(providerId);
        
        // Get provider name
        String providerName = providerRepository.findById(providerId)
                .map(Provider::getName)
                .orElse("مقدم خدمة #" + providerId);
        
        // Verify balance integrity
        BigDecimal calculatedBalance = transactionRepository.getCalculatedBalance(account.getId());
        if (calculatedBalance == null) {
            calculatedBalance = BigDecimal.ZERO;
        }
        
        boolean balanceVerified = account.getRunningBalance().compareTo(calculatedBalance) == 0;
        if (!balanceVerified) {
            log.error("BALANCE MISMATCH! Account {}: stored={}, calculated={}",
                    account.getId(), account.getRunningBalance(), calculatedBalance);
        }
        
        long transactionCount = transactionRepository.countByProviderAccountId(account.getId());
        
        return AccountSummaryDTO.builder()
                .accountId(account.getId())
                .providerId(providerId)
                .providerName(providerName)
                .runningBalance(account.getRunningBalance())
                .totalApproved(account.getTotalApproved())
                .totalPaid(account.getTotalPaid())
                .status(account.getStatus().name())
                .statusArabic(account.getStatus().getArabicLabel())
                .transactionCount(transactionCount)
                .balanceVerified(balanceVerified)
                .lastTransactionId(null) // Optional field in DTO
                .build();
    }

    /**
     * Get transactions for a provider account.
     */
    @Transactional(readOnly = true)
    public Page<AccountTransaction> getTransactions(Long providerId, Pageable pageable) {
        ProviderAccount account = getAccountByProviderId(providerId);
        return transactionRepository.findByProviderAccountIdOrderByCreatedAtDesc(account.getId(), pageable);
    }

    /**
     * Get transactions in date range (for account statements).
     */
    @Transactional(readOnly = true)
    public List<AccountTransaction> getTransactionsInDateRange(
            Long providerId, 
            LocalDateTime startDate, 
            LocalDateTime endDate) {
        ProviderAccount account = getAccountByProviderId(providerId);
        return transactionRepository.findByAccountAndDateRange(account.getId(), startDate, endDate);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ACCOUNT STATUS MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════════

    @Transactional
    public ProviderAccount suspendAccount(Long providerId, String reason) {
        ProviderAccount account = getAccountForUpdate(providerId);
        account.suspend();
        log.warn("Account suspended: provider={}, reason={}", providerId, reason);
        return accountRepository.save(account);
    }

    @Transactional
    public ProviderAccount reactivateAccount(Long providerId) {
        ProviderAccount account = getAccountForUpdate(providerId);
        account.reactivate();
        log.info("Account reactivated: provider={}", providerId);
        return accountRepository.save(account);
    }

    @Transactional
    public ProviderAccount closeAccount(Long providerId, String reason) {
        ProviderAccount account = getAccountForUpdate(providerId);
        account.close();
        log.warn("Account closed: provider={}, reason={}", providerId, reason);
        return accountRepository.save(account);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // BALANCE VERIFICATION (FOR AUDITING)
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Verify account balance matches transaction history.
     */
    @Transactional(readOnly = true)
    public boolean verifyAccountBalance(Long accountId) {
        ProviderAccount account = getAccountById(accountId);
        
        BigDecimal calculatedBalance = transactionRepository.getCalculatedBalance(accountId);
        if (calculatedBalance == null) {
            calculatedBalance = BigDecimal.ZERO;
        }
        
        boolean match = account.getRunningBalance().compareTo(calculatedBalance) == 0;
        
        if (!match) {
            log.error("CRITICAL: Balance verification FAILED for account {}. " +
                    "Stored: {}, Calculated: {}", 
                    accountId, account.getRunningBalance(), calculatedBalance);
        }
        
        return match;
    }

    /**
     * Get all providers with outstanding balance.
     */
    @Transactional(readOnly = true)
    public List<ProviderAccount> getAccountsWithOutstandingBalance() {
        return accountRepository.findWithOutstandingBalance(AccountStatus.ACTIVE);
    }

    /**
     * Get all provider accounts as DTOs with provider names.
     */
    @Transactional(readOnly = true)
    public List<ProviderAccountListDTO> getAccountsWithProviderNames() {
        List<ProviderAccount> accounts = accountRepository.findWithOutstandingBalance(AccountStatus.ACTIVE);
        
        return accounts.stream().map(account -> {
            // Get provider info
            Provider provider = providerRepository.findById(account.getProviderId()).orElse(null);
            String providerName = provider != null ? provider.getName() : "مقدم خدمة #" + account.getProviderId();
            String providerType = provider != null && provider.getProviderType() != null 
                    ? provider.getProviderType().name() 
                    : null;
            
            return ProviderAccountListDTO.builder()
                    .accountId(account.getId())
                    .providerId(account.getProviderId())
                    .providerName(providerName)
                    .providerType(providerType)
                    .runningBalance(account.getRunningBalance())
                    .totalApproved(account.getTotalApproved())
                    .totalPaid(account.getTotalPaid())
                    .status(account.getStatus().name())
                    .statusArabic(account.getStatus().getArabicLabel())
                    .pendingClaimsCount(0) // TODO: Calculate from claims
                    .updatedAt(account.getUpdatedAt())
                    .build();
        }).toList();
    }

    /**
     * Get total outstanding balance across all providers.
     */
    @Transactional(readOnly = true)
    public BigDecimal getTotalOutstandingBalance() {
        BigDecimal total = accountRepository.getTotalOutstandingBalance();
        return total != null ? total : BigDecimal.ZERO;
    }
}
