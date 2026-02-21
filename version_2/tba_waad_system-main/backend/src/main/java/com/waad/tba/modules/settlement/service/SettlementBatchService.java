package com.waad.tba.modules.settlement.service;

import com.waad.tba.modules.claim.entity.Claim;
import com.waad.tba.modules.claim.entity.ClaimStatus;
import com.waad.tba.modules.claim.repository.ClaimRepository;
import com.waad.tba.modules.provider.entity.Provider;
import com.waad.tba.modules.provider.repository.ProviderRepository;
import com.waad.tba.modules.settlement.entity.*;
import com.waad.tba.modules.settlement.entity.SettlementBatch.BatchStatus;
import com.waad.tba.modules.settlement.entity.SettlementBatch.PaymentMethod;
import com.waad.tba.modules.settlement.repository.*;
import com.waad.tba.modules.settlement.dto.BatchSummaryDTO;
import com.waad.tba.modules.settlement.dto.CreateBatchRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityNotFoundException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Settlement Batch Service
 * 
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                    SETTLEMENT BATCH SERVICE                                   ║
 * ║───────────────────────────────────────────────────────────────────────────────║
 * ║ Manages the lifecycle of settlement batches:                                  ║
 * ║                                                                               ║
 * ║   DRAFT ────────→ CONFIRMED ────────→ PAID (terminal)                         ║
 * ║      ↓                ↓                                                       ║
 * ║   CANCELLED       CANCELLED                                                   ║
 * ║                                                                               ║
 * ║ KEY RULES:                                                                    ║
 * ║ ✓ Claims can only be added/removed in DRAFT status                            ║
 * ║ ✓ Each claim can only be in ONE batch                                         ║
 * ║ ✓ Claims must be APPROVED to be added                                         ║
 * ║ ✓ Confirming locks the batch (no modifications)                               ║
 * ║ ✓ Paying creates DEBIT transaction and settles all claims                     ║
 * ║ ✓ Cancelling returns claims to APPROVED status                                ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SettlementBatchService {

    private final SettlementBatchRepository batchRepository;
    private final SettlementBatchItemRepository itemRepository;
    private final ProviderAccountRepository accountRepository;
    private final ProviderAccountService accountService;
    private final ClaimRepository claimRepository;
    private final ProviderRepository providerRepository;

    // ═══════════════════════════════════════════════════════════════════════════
    // BATCH CREATION
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Create a new settlement batch in DRAFT status.
     */
    @Transactional
    public SettlementBatch createBatch(Long providerId, String notes, Long userId) {
        // 1. Ensure provider account exists
        ProviderAccount account = accountService.getOrCreateAccount(providerId);
        
        // 2. Generate batch number
        String batchNumber = generateBatchNumber();
        
        // 3. Create batch
        SettlementBatch batch = SettlementBatch.builder()
                .batchNumber(batchNumber)
                .providerAccountId(account.getId())
                .settlementDate(LocalDate.now())
                .status(BatchStatus.DRAFT)
                .totalClaimsCount(0)
                .totalGrossAmount(BigDecimal.ZERO)
                .totalNetAmount(BigDecimal.ZERO)
                .totalPatientShare(BigDecimal.ZERO)
                .notes(notes)
                .createdBy(userId)
                .build();
        
        batch = batchRepository.save(batch);
        
        log.info("Batch created: id={}, number={}, provider={}", 
                batch.getId(), batchNumber, providerId);
        
        return batch;
    }

    /**
     * Create a batch with claims in a single operation.
     */
    @Transactional
    public SettlementBatch createBatchWithClaims(CreateBatchRequest request) {
        // 1. Create the batch
        SettlementBatch batch = createBatch(
                request.getProviderId(), 
                request.getDescription(), 
                request.getCreatedBy()
        );
        
        // 2. Add claims
        if (request.getClaimIds() != null && !request.getClaimIds().isEmpty()) {
            addClaimsToBatch(batch.getId(), request.getClaimIds());
        }
        
        return batchRepository.findById(batch.getId()).orElseThrow();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // CLAIM MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Add claims to a batch.
     */
    @Transactional
    public List<Long> addClaimsToBatch(Long batchId, List<Long> claimIds) {
        // 1. Get batch with lock
        SettlementBatch batch = batchRepository.findByIdForUpdate(batchId)
                .orElseThrow(() -> new EntityNotFoundException("Batch not found: " + batchId));
        
        // 2. Validate batch is modifiable
        if (!batch.isModifiable()) {
            throw new IllegalStateException(
                "Cannot add claims to batch " + batchId + ". Status is: " + batch.getStatus());
        }
        
        // 3. Get provider ID from account
        ProviderAccount account = accountRepository.findById(batch.getProviderAccountId())
                .orElseThrow(() -> new EntityNotFoundException("Provider account not found"));
        Long providerId = account.getProviderId();
        
        // 4. Find claims already in a batch
        List<Long> alreadyInBatch = itemRepository.findClaimIdsAlreadyInBatch(claimIds);
        if (!alreadyInBatch.isEmpty()) {
            log.warn("Claims already in batch: {}", alreadyInBatch);
            claimIds = claimIds.stream()
                    .filter(id -> !alreadyInBatch.contains(id))
                    .collect(Collectors.toList());
        }
        
        List<Long> addedClaimIds = new ArrayList<>();
        
        // 5. Process each claim
        for (Long claimId : claimIds) {
            try {
                Claim claim = claimRepository.findById(claimId)
                        .orElseThrow(() -> new EntityNotFoundException("Claim not found: " + claimId));
                
                // Validate claim
                validateClaimForBatch(claim, providerId);
                
                // Create batch item
                SettlementBatchItem item = SettlementBatchItem.createFromClaim(
                        batch.getId(),
                        claim.getId(),
                        claim.getRequestedAmount(),
                        claim.getNetPayableAmount(),
                        claim.getPatientCoPay()
                );
                itemRepository.save(item);
                
                // Update claim status
                claim.addToBatch(batch.getId());
                claimRepository.save(claim);
                
                addedClaimIds.add(claimId);
                
                log.debug("Claim {} added to batch {}", claimId, batchId);
                
            } catch (Exception e) {
                log.warn("Failed to add claim {} to batch {}: {}", claimId, batchId, e.getMessage());
            }
        }
        
        // 6. Recalculate batch totals
        recalculateBatchTotals(batch);
        batchRepository.save(batch);
        
        log.info("Added {} claims to batch {}", addedClaimIds.size(), batchId);
        
        return addedClaimIds;
    }

    /**
     * Remove claims from a batch.
     */
    @Transactional
    public List<Long> removeClaimsFromBatch(Long batchId, List<Long> claimIds) {
        // 1. Get batch with lock
        SettlementBatch batch = batchRepository.findByIdForUpdate(batchId)
                .orElseThrow(() -> new EntityNotFoundException("Batch not found: " + batchId));
        
        // 2. Validate batch is modifiable
        if (!batch.isModifiable()) {
            throw new IllegalStateException(
                "Cannot remove claims from batch " + batchId + ". Status is: " + batch.getStatus());
        }
        
        List<Long> removedClaimIds = new ArrayList<>();
        
        // 3. Process each claim
        for (Long claimId : claimIds) {
            try {
                // Check if claim is in this batch
                SettlementBatchItem item = itemRepository.findByClaimId(claimId)
                        .orElse(null);
                
                if (item == null || !item.getSettlementBatchId().equals(batchId)) {
                    log.warn("Claim {} is not in batch {}", claimId, batchId);
                    continue;
                }
                
                // Get claim
                Claim claim = claimRepository.findById(claimId)
                        .orElseThrow(() -> new EntityNotFoundException("Claim not found: " + claimId));
                
                // Remove from batch
                claim.removeFromBatch();
                claimRepository.save(claim);
                
                // Delete batch item
                itemRepository.delete(item);
                
                removedClaimIds.add(claimId);
                
                log.debug("Claim {} removed from batch {}", claimId, batchId);
                
            } catch (Exception e) {
                log.warn("Failed to remove claim {} from batch {}: {}", claimId, batchId, e.getMessage());
            }
        }
        
        // 4. Recalculate batch totals
        recalculateBatchTotals(batch);
        batchRepository.save(batch);
        
        log.info("Removed {} claims from batch {}", removedClaimIds.size(), batchId);
        
        return removedClaimIds;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // BATCH LIFECYCLE
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Confirm a batch (lock it for payment).
     */
    @Transactional
    public SettlementBatch confirmBatch(Long batchId, Long userId) {
        // 1. Get batch with lock
        SettlementBatch batch = batchRepository.findByIdForUpdate(batchId)
                .orElseThrow(() -> new EntityNotFoundException("Batch not found: " + batchId));
        
        // 2. Validate
        if (!batch.canConfirm()) {
            throw new IllegalStateException(
                "Cannot confirm batch " + batchId + ". Status is: " + batch.getStatus() + 
                ", claims: " + batch.getTotalClaimsCount());
        }
        
        // 3. Confirm
        batch.confirm(userId);
        batchRepository.save(batch);
        
        log.info("Batch confirmed: id={}, claims={}, amount={}", 
                batchId, batch.getTotalClaimsCount(), batch.getTotalNetAmount());
        
        return batch;
    }

    /**
     * Pay a batch (process the settlement).
     * 
     * This is the critical financial operation:
     * 1. Creates DEBIT transaction on provider account
     * 2. Updates provider account balance
     * 3. Marks all claims as SETTLED
     */
    @Transactional
    public SettlementBatch payBatch(Long batchId, String paymentReference, PaymentMethod paymentMethod, Long userId) {
        // 1. Get batch with lock
        SettlementBatch batch = batchRepository.findByIdForUpdate(batchId)
                .orElseThrow(() -> new EntityNotFoundException("Batch not found: " + batchId));
        
        // 2. Validate
        if (!batch.canPay()) {
            throw new IllegalStateException(
                "Cannot pay batch " + batchId + ". Status is: " + batch.getStatus());
        }
        
        // 3. Get provider account with lock
        ProviderAccount account = accountRepository.findByIdForUpdate(batch.getProviderAccountId())
                .orElseThrow(() -> new EntityNotFoundException(
                    "Provider account not found: " + batch.getProviderAccountId()));
        
        // 4. Validate sufficient balance
        BigDecimal paymentAmount = batch.getTotalNetAmount();
        if (account.getRunningBalance().compareTo(paymentAmount) < 0) {
            throw new IllegalStateException(
                "Insufficient balance. Account: " + account.getId() + 
                ", Balance: " + account.getRunningBalance() + 
                ", Required: " + paymentAmount);
        }
        
        // 5. Create DEBIT transaction
        accountService.debitOnBatchPayment(
                account.getId(), 
                batchId, 
                batch.getBatchNumber(),
                paymentAmount, 
                userId
        );
        
        // 6. Update all claims to SETTLED
        List<SettlementBatchItem> items = itemRepository.findBySettlementBatchId(batchId);
        LocalDateTime settledAt = LocalDateTime.now();
        
        for (SettlementBatchItem item : items) {
            Claim claim = claimRepository.findById(item.getClaimId())
                    .orElseThrow(() -> new EntityNotFoundException("Claim not found: " + item.getClaimId()));
            
            claim.setStatus(ClaimStatus.SETTLED);
            claim.setSettledAt(settledAt);
            claim.setPaymentReference(paymentReference);
            claim.setSettlementNotes("Settled via batch #" + batch.getBatchNumber());
            claim.setUpdatedAt(settledAt);
            
            claimRepository.save(claim);
        }
        
        // 7. Update batch
        batch.pay(userId, paymentReference, paymentMethod, LocalDate.now());
        batchRepository.save(batch);
        
        log.info("BATCH PAID: id={}, batchNumber={}, claims={}, amount={}, paymentRef={}",
                batchId, batch.getBatchNumber(), batch.getTotalClaimsCount(), paymentAmount, paymentReference);
        
        return batch;
    }

    /**
     * Cancel a batch.
     */
    @Transactional
    public SettlementBatch cancelBatch(Long batchId, String reason, Long userId) {
        // 1. Get batch with lock
        SettlementBatch batch = batchRepository.findByIdForUpdate(batchId)
                .orElseThrow(() -> new EntityNotFoundException("Batch not found: " + batchId));
        
        // 2. Validate
        if (!batch.canCancel()) {
            throw new IllegalStateException(
                "Cannot cancel batch " + batchId + ". Status is: " + batch.getStatus());
        }
        
        // 3. Return all claims to APPROVED status
        List<SettlementBatchItem> items = itemRepository.findBySettlementBatchId(batchId);
        
        for (SettlementBatchItem item : items) {
            Claim claim = claimRepository.findById(item.getClaimId())
                    .orElse(null);
            
            if (claim != null && claim.getStatus() == ClaimStatus.BATCHED) {
                claim.removeFromBatch();
                claimRepository.save(claim);
            }
        }
        
        // 4. Delete batch items
        itemRepository.deleteBySettlementBatchId(batchId);
        
        // 5. Cancel batch
        batch.cancel(userId, reason);
        batchRepository.save(batch);
        
        log.info("Batch cancelled: id={}, reason={}", batchId, reason);
        
        return batch;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // QUERIES
    // ═══════════════════════════════════════════════════════════════════════════

    @Transactional(readOnly = true)
    public SettlementBatch getBatchById(Long batchId) {
        return batchRepository.findById(batchId)
                .orElseThrow(() -> new EntityNotFoundException("Batch not found: " + batchId));
    }

    @Transactional(readOnly = true)
    public BatchSummaryDTO getBatchSummary(Long batchId) {
        SettlementBatch batch = getBatchById(batchId);
        ProviderAccount account = accountRepository.findById(batch.getProviderAccountId())
                .orElseThrow(() -> new EntityNotFoundException("Account not found"));
        List<SettlementBatchItem> items = itemRepository.findBySettlementBatchId(batchId);
        
        // Get provider name
        String providerName = providerRepository.findById(account.getProviderId())
                .map(Provider::getName)
                .orElse("مقدم خدمة #" + account.getProviderId());
        
        return BatchSummaryDTO.builder()
                .batchId(batch.getId())
                .batchNumber(batch.getBatchNumber())
                .providerId(account.getProviderId())
                .providerName(providerName)
                .status(batch.getStatus().name())
                .statusArabic(batch.getStatus().getArabicLabel())
                .claimCount(batch.getTotalClaimsCount())
                .totalGrossAmount(batch.getTotalGrossAmount())
                .totalNetAmount(batch.getTotalNetAmount())
                .totalPatientShare(batch.getTotalPatientShare())
                .description(batch.getNotes())
                .paymentReference(batch.getPaymentReference())
                .items(items)
                .createdBy(batch.getCreatedBy())
                .createdAt(batch.getCreatedAt())
                .confirmedBy(batch.getConfirmedBy())
                .confirmedAt(batch.getConfirmedAt())
                .paidBy(batch.getPaidBy())
                .paidAt(batch.getPaidAt())
                .cancelledBy(batch.getCancelledBy())
                .cancelledAt(batch.getCancelledAt())
                .cancellationReason(batch.getCancellationReason())
                .build();
    }

    @Transactional(readOnly = true)
    public Page<SettlementBatch> getBatchesByProviderAccount(Long providerAccountId, Pageable pageable) {
        return batchRepository.findByProviderAccountId(providerAccountId, pageable);
    }

    @Transactional(readOnly = true)
    public Page<SettlementBatch> getBatchesByStatus(BatchStatus status, Pageable pageable) {
        return batchRepository.findByStatus(status, pageable);
    }
    
    /**
     * ✅ NEW: Get ALL batches regardless of status
     */
    @Transactional(readOnly = true)
    public Page<SettlementBatch> getAllBatches(Pageable pageable) {
        return batchRepository.findAll(pageable);
    }
    
    /**
     * ✅ NEW: Get provider for a batch (for DTO mapping)
     */
    @Transactional(readOnly = true)
    public Provider getProviderForBatch(SettlementBatch batch) {
        ProviderAccount account = accountRepository.findById(batch.getProviderAccountId())
                .orElse(null);
        
        if (account == null) {
            return null;
        }
        
        return providerRepository.findById(account.getProviderId())
                .orElse(null);
    }

    /**
     * Get claims that can be batched for a provider.
     * Returns APPROVED claims that are not in any batch.
     */
    @Transactional(readOnly = true)
    public List<Claim> getAvailableClaimsForBatching(Long providerId) {
        return claimRepository.findByProviderIdAndStatusAndSettlementBatchIdIsNull(
                providerId, ClaimStatus.APPROVED);
    }

    @Transactional(readOnly = true)
    public List<SettlementBatchItem> getBatchItems(Long batchId) {
        return itemRepository.findBySettlementBatchId(batchId);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // HELPER METHODS
    // ═══════════════════════════════════════════════════════════════════════════

    private void validateClaimForBatch(Claim claim, Long providerId) {
        // Must be APPROVED
        if (claim.getStatus() != ClaimStatus.APPROVED) {
            throw new IllegalStateException(
                "Claim " + claim.getId() + " must be APPROVED. Current status: " + claim.getStatus());
        }
        
        // Must be same provider
        if (!claim.getProviderId().equals(providerId)) {
            throw new IllegalStateException(
                "Claim " + claim.getId() + " belongs to provider " + claim.getProviderId() + 
                " but batch is for provider " + providerId);
        }
        
        // Must not be in a batch already
        if (claim.getSettlementBatchId() != null) {
            throw new IllegalStateException(
                "Claim " + claim.getId() + " is already in batch " + claim.getSettlementBatchId());
        }
        
        // Must have valid amount
        BigDecimal amount = claim.getNetPayableAmount();
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalStateException(
                "Claim " + claim.getId() + " has invalid net amount: " + amount);
        }
    }

    private void recalculateBatchTotals(SettlementBatch batch) {
        List<Object[]> totals = itemRepository.getBatchTotals(batch.getId());
        
        if (totals != null && !totals.isEmpty()) {
            Object[] row = totals.get(0);
            batch.setTotalClaimsCount(((Number) row[0]).intValue());
            batch.setTotalGrossAmount((BigDecimal) row[1]);
            batch.setTotalNetAmount((BigDecimal) row[2]);
            batch.setTotalPatientShare((BigDecimal) row[3]);
        } else {
            batch.setTotalClaimsCount(0);
            batch.setTotalGrossAmount(BigDecimal.ZERO);
            batch.setTotalNetAmount(BigDecimal.ZERO);
            batch.setTotalPatientShare(BigDecimal.ZERO);
        }
    }

    private String generateBatchNumber() {
        String prefix = "STL-" + LocalDate.now().getYear() + "-";
        
        // Get next sequence
        var latestNumber = batchRepository.findLatestBatchNumber(prefix);
        
        int sequence = 1;
        if (latestNumber.isPresent()) {
            try {
                String seqPart = latestNumber.get().substring(prefix.length());
                sequence = Integer.parseInt(seqPart) + 1;
            } catch (Exception e) {
                log.warn("Failed to parse batch sequence from: {}", latestNumber.get());
            }
        }
        
        return prefix + String.format("%06d", sequence);
    }
}
