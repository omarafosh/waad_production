package com.waad.tba.modules.settlement.controller;

import com.waad.tba.common.dto.PaginationResponse;
import com.waad.tba.modules.settlement.dto.AccountSummaryDTO;
import com.waad.tba.modules.settlement.dto.ProviderAccountListDTO;
import com.waad.tba.modules.settlement.entity.AccountTransaction;
import com.waad.tba.modules.settlement.service.ProviderAccountService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Provider Account Management API
 */
@RestController
@RequestMapping("/api/v1/settlement/accounts")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Settlement Accounts", description = "Manage provider financial accounts")
public class ProviderAccountController {

    private final ProviderAccountService accountService;

    // ═══════════════════════════════════════════════════════════════════════════
    // READ
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * List all provider accounts (with balance)
     */
    @GetMapping
    @PreAuthorize("hasAuthority('SETTLEMENT_VIEW')")
    @Operation(summary = "List provider accounts", description = "List all provider accounts with balances")
    public ResponseEntity<PaginationResponse<ProviderAccountListDTO>> listAccounts(
            @RequestParam(required = false) String search,
            @PageableDefault(size = 20, sort = "updatedAt", direction = Sort.Direction.DESC) Pageable pageable) {

        // Service currently returns a List, we need to paginate it manually or update service
        // For now, wrapping the list from getAccountsWithProviderNames as that method fetches all
        // Ideally service should support pagination
        List<ProviderAccountListDTO> allAccounts = accountService.getAccountsWithProviderNames();

        // Simple in-memory filtering and pagination for now to match interface
        // In real prod, this should be done in DB
        List<ProviderAccountListDTO> filtered = allAccounts;
        if (search != null && !search.isEmpty()) {
            String lowerSearch = search.toLowerCase();
            filtered = allAccounts.stream()
                .filter(a -> (a.getProviderName() != null && a.getProviderName().toLowerCase().contains(lowerSearch)) ||
                             String.valueOf(a.getProviderId()).contains(search))
                .toList();
        }

        int start = (int) pageable.getOffset();
        int end = Math.min((start + pageable.getPageSize()), filtered.size());
        
        List<ProviderAccountListDTO> pageContent;
        if (start > filtered.size()) {
            pageContent = List.of();
        } else {
            pageContent = filtered.subList(start, end);
        }

        return ResponseEntity.ok(PaginationResponse.<ProviderAccountListDTO>builder()
                .items(pageContent)
                .total((long) filtered.size())
                .page(pageable.getPageNumber())
                .size(pageable.getPageSize())
                .build());
    }

    /**
     * Get account details by Provider ID
     */
    @GetMapping("/{providerId}")
    @PreAuthorize("hasAuthority('SETTLEMENT_VIEW')")
    @Operation(summary = "Get account details", description = "Get details of a specific provider account")
    public ResponseEntity<AccountSummaryDTO> getAccount(@PathVariable Long providerId) {
        AccountSummaryDTO summary = accountService.getAccountSummary(providerId);
        return ResponseEntity.ok(summary);
    }

    /**
     * Get account transactions
     */
    @GetMapping("/{providerId}/transactions")
    @PreAuthorize("hasAuthority('SETTLEMENT_VIEW')")
    @Operation(summary = "Get account transactions", description = "Get transaction history for a provider account")
    public ResponseEntity<PaginationResponse<AccountTransaction>> getTransactions(
            @PathVariable Long providerId,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        
        Page<AccountTransaction> page = accountService.getTransactions(providerId, pageable);
        
        return ResponseEntity.ok(PaginationResponse.of(page));
    }
}
