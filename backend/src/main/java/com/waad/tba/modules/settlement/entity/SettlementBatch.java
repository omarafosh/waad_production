package com.waad.tba.modules.settlement.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Settlement Batch Entity
 * 
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                         SETTLEMENT BATCH                                      ║
 * ║───────────────────────────────────────────────────────────────────────────────║
 * ║ Groups multiple claims into a single payment batch for provider settlement.   ║
 * ║                                                                               ║
 * ║ Workflow: DRAFT → CONFIRMED → PAID                                            ║
 * ║                     ↓                                                         ║
 * ║                 CANCELLED                                                     ║
 * ║                                                                               ║
 * ║ DRAFT:     Can add/remove claims                                              ║
 * ║ CONFIRMED: Locked, awaiting payment                                           ║
 * ║ PAID:      Payment complete, claims settled                                   ║
 * ║ CANCELLED: Void, claims returned to APPROVED                                  ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */
@Entity
@Table(name = "settlement_batches")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SettlementBatch {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Unique batch number (format: STL-YYYY-NNNNNN)
     * Example: STL-2026-000001
     */
    @Column(name = "batch_number", nullable = false, unique = true, length = 50)
    private String batchNumber;

    /**
     * Provider account this batch belongs to
     */
    @Column(name = "provider_account_id", nullable = false)
    private Long providerAccountId;

    /**
     * Settlement date
     */
    @Column(name = "settlement_date", nullable = false)
    private LocalDate settlementDate;

    // ═══════════════════════════════════════════════════════════════════════════
    // AGGREGATED AMOUNTS (calculated from items)
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Number of claims in this batch
     */
    @Column(name = "total_claims_count", nullable = false)
    @Builder.Default
    private Integer totalClaimsCount = 0;

    /**
     * Sum of requested amounts (gross)
     */
    @Column(name = "total_gross_amount", nullable = false, precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal totalGrossAmount = BigDecimal.ZERO;

    /**
     * Sum of net provider amounts (actual payment)
     */
    @Column(name = "total_net_amount", nullable = false, precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal totalNetAmount = BigDecimal.ZERO;

    /**
     * Sum of patient share amounts
     */
    @Column(name = "total_patient_share", nullable = false, precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal totalPatientShare = BigDecimal.ZERO;

    // ═══════════════════════════════════════════════════════════════════════════
    // STATUS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Batch status (workflow state)
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private BatchStatus status = BatchStatus.DRAFT;

    // ═══════════════════════════════════════════════════════════════════════════
    // PAYMENT DETAILS (filled when PAID)
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Payment reference (bank transfer number, check number, etc.)
     * Required when status = PAID
     */
    @Column(name = "payment_reference", length = 100)
    private String paymentReference;

    /**
     * Payment method
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method", length = 50)
    private PaymentMethod paymentMethod;

    /**
     * Actual payment date
     */
    @Column(name = "payment_date")
    private LocalDate paymentDate;

    /**
     * Bank account number for the payment
     */
    @Column(name = "bank_account_number", length = 50)
    private String bankAccountNumber;

    /**
     * Notes/comments
     */
    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    // ═══════════════════════════════════════════════════════════════════════════
    // WORKFLOW TRACKING
    // ═══════════════════════════════════════════════════════════════════════════

    @Column(name = "created_by")
    private Long createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "confirmed_by")
    private Long confirmedBy;

    @Column(name = "confirmed_at")
    private LocalDateTime confirmedAt;

    @Column(name = "paid_by")
    private Long paidBy;

    @Column(name = "paid_at")
    private LocalDateTime paidAt;

    @Column(name = "cancelled_by")
    private Long cancelledBy;

    @Column(name = "cancelled_at")
    private LocalDateTime cancelledAt;

    @Column(name = "cancellation_reason", columnDefinition = "TEXT")
    private String cancellationReason;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    /**
     * Optimistic locking version
     */
    @Version
    @Column(name = "version", nullable = false)
    private Long version;

    // ═══════════════════════════════════════════════════════════════════════════
    // RELATIONSHIPS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Items in this batch (claims)
     */
    @OneToMany(mappedBy = "settlementBatch", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @ToString.Exclude
    @Builder.Default
    private List<SettlementBatchItem> items = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // BUSINESS METHODS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Check if batch can be modified (add/remove claims)
     */
    public boolean isModifiable() {
        return status == BatchStatus.DRAFT;
    }

    /**
     * Check if batch can be confirmed
     */
    public boolean canConfirm() {
        return status == BatchStatus.DRAFT && totalClaimsCount > 0;
    }

    /**
     * Check if batch can be paid
     */
    public boolean canPay() {
        return status == BatchStatus.CONFIRMED;
    }

    /**
     * Check if batch can be cancelled
     */
    public boolean canCancel() {
        return status == BatchStatus.DRAFT || status == BatchStatus.CONFIRMED;
    }

    /**
     * Confirm the batch (DRAFT → CONFIRMED)
     */
    public void confirm(Long userId) {
        if (!canConfirm()) {
            throw new IllegalStateException(
                String.format("Cannot confirm batch in status %s with %d claims", status, totalClaimsCount)
            );
        }
        this.status = BatchStatus.CONFIRMED;
        this.confirmedBy = userId;
        this.confirmedAt = LocalDateTime.now();
    }

    /**
     * Mark batch as paid (CONFIRMED → PAID)
     */
    public void pay(Long userId, String paymentRef, PaymentMethod method, LocalDate payDate) {
        if (!canPay()) {
            throw new IllegalStateException("Cannot pay batch in status: " + status);
        }
        if (paymentRef == null || paymentRef.trim().isEmpty()) {
            throw new IllegalArgumentException("Payment reference is required");
        }
        this.status = BatchStatus.PAID;
        this.paidBy = userId;
        this.paidAt = LocalDateTime.now();
        this.paymentReference = paymentRef;
        this.paymentMethod = method;
        this.paymentDate = payDate != null ? payDate : LocalDate.now();
    }

    /**
     * Cancel the batch (DRAFT|CONFIRMED → CANCELLED)
     */
    public void cancel(Long userId, String reason) {
        if (!canCancel()) {
            throw new IllegalStateException("Cannot cancel batch in status: " + status);
        }
        if (reason == null || reason.trim().isEmpty()) {
            throw new IllegalArgumentException("Cancellation reason is required");
        }
        this.status = BatchStatus.CANCELLED;
        this.cancelledBy = userId;
        this.cancelledAt = LocalDateTime.now();
        this.cancellationReason = reason;
    }

    /**
     * Update totals from items
     */
    public void recalculateTotals() {
        if (items == null || items.isEmpty()) {
            this.totalClaimsCount = 0;
            this.totalGrossAmount = BigDecimal.ZERO;
            this.totalNetAmount = BigDecimal.ZERO;
            this.totalPatientShare = BigDecimal.ZERO;
            return;
        }

        this.totalClaimsCount = items.size();
        this.totalGrossAmount = items.stream()
            .map(SettlementBatchItem::getGrossAmountSnapshot)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        this.totalNetAmount = items.stream()
            .map(SettlementBatchItem::getNetAmountSnapshot)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        this.totalPatientShare = items.stream()
            .map(SettlementBatchItem::getPatientShareSnapshot)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ENUM: Batch Status
    // ═══════════════════════════════════════════════════════════════════════════

    public enum BatchStatus {
        /** Draft - can add/remove claims */
        DRAFT("مسودة"),
        
        /** Confirmed - locked, awaiting payment */
        CONFIRMED("مؤكدة"),
        
        /** Paid - payment complete */
        PAID("مدفوعة"),
        
        /** Cancelled - void */
        CANCELLED("ملغاة");

        private final String arabicLabel;

        BatchStatus(String arabicLabel) {
            this.arabicLabel = arabicLabel;
        }

        public String getArabicLabel() {
            return arabicLabel;
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ENUM: Payment Method
    // ═══════════════════════════════════════════════════════════════════════════

    public enum PaymentMethod {
        /** Bank transfer */
        BANK_TRANSFER("تحويل بنكي"),
        
        /** Check payment */
        CHECK("شيك"),
        
        /** Cash payment */
        CASH("نقدي"),
        
        /** Wire transfer */
        WIRE_TRANSFER("حوالة سلكية");

        private final String arabicLabel;

        PaymentMethod(String arabicLabel) {
            this.arabicLabel = arabicLabel;
        }

        public String getArabicLabel() {
            return arabicLabel;
        }
    }
}
