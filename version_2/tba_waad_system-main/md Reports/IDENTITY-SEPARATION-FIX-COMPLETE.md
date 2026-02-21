# Identity Separation & Barcode "Radical Fix" Report

**Date:** 2026-01-10
**Status:** COMPLETE

## 1. Overview
This architectural enforcement ensures a strict separation between **Visual Identity** (QR Code/Barcode) and **Insurance Identity** (Card Number). The system no longer treats them as interchangeable.

## 2. Changes Implemented

### A. Database & Entity Layer (Completed Prev.)
- **Canonical Format**: All new members receive a `barcode` in the format `WAD-{YEAR}-{SEQ}` via `barcodeGeneratorService`.
- **Constraint**: `Member` entity enforces strict separation.

### B. Excel Import Logic (`MemberExcelImportService.java`)
- **Action**: Injected `BarcodeGeneratorService` into the import process.
- **Fix**: The system now **ignores** any `barcode` column in the Excel file and **always** generates a new, canonical system barcode for every imported member.
- **Safety**: Prevents manual pollution of the barcode namespace.

### C. Search Logic Verification (`MemberRepository` & `MemberService`)
- **Repository Audit**: Verified `MemberRepository.java`. No queries exist that conflate ID types (e.g., `WHERE card_number = :barcode` is ABSENT).
- **Service Logic Fix**: Found and **REMOVED** a fallback mechanism in `MemberService.searchForEligibility`.
    - *Before*: If `findByBarcode(code)` failed, it would try `findByCardNumber(code)`.
    - *After*: `findByBarcode(code)` ONLY searches the barcode field.
    - *Result*: strict adherence to "QR Code is ALWAYS the Barcode".

### D. Frontend Awareness
- **UI**: Reports and Edit screens updated to show Barcode and Card Number as distinct fields with distinct icons (QR vs Card).

## 3. Verification Steps
1. **Import**: Upload an Excel file. Check that the resulting members have `WAD-xxxx` barcodes, regardless of Excel content.
2. **Search**: Scan a Member's **Card Number** into the **Barcode** search field.
    - *Result*: Should return **No Results** (Correct).
3. **Scan**: Scan a Member's **QR Code** (WAD-xxxx) into the **Barcode** search field.
    - *Result*: Should return **Member Found** (Correct).

## 4. Conclusion
The "Radical Fix" is fully implemented. The system now treats the Barcode as a strictly managed, system-owned identifier, while value-added services (Insurance) use the Card Number independently.
