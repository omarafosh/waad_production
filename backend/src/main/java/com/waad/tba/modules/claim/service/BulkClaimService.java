package com.waad.tba.modules.claim.service;

import com.waad.tba.common.entity.Organization;
import com.waad.tba.modules.claim.dto.BulkClaimEntryDto;
import com.waad.tba.modules.claim.dto.BulkUploadResultDto;
import com.waad.tba.modules.claim.entity.Claim;
import com.waad.tba.modules.claim.entity.ClaimLine;
import com.waad.tba.modules.claim.entity.ClaimStatus;
import com.waad.tba.modules.claim.repository.ClaimRepository;
import com.waad.tba.modules.medicaltaxonomy.entity.MedicalService;
import com.waad.tba.modules.medicaltaxonomy.repository.MedicalServiceRepository;
import com.waad.tba.modules.member.entity.Member;
import com.waad.tba.modules.member.repository.MemberRepository;
import com.waad.tba.modules.provider.entity.Provider;
import com.waad.tba.modules.provider.repository.ProviderRepository;
import com.waad.tba.modules.providercontract.entity.ProviderContract;
import com.waad.tba.modules.providercontract.repository.ProviderContractRepository;
import com.waad.tba.modules.visit.entity.Visit;
import com.waad.tba.modules.visit.entity.VisitStatus;
import com.waad.tba.modules.visit.entity.VisitType;
import com.waad.tba.modules.visit.repository.VisitRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class BulkClaimService {

    private final MemberRepository memberRepository;
    private final MedicalServiceRepository medicalServiceRepository;
    private final ProviderRepository providerRepository;
    private final VisitRepository visitRepository;
    private final ClaimRepository claimRepository;
    private final ProviderContractRepository providerContractRepository;

    @Transactional
    public BulkUploadResultDto processBulkUpload(MultipartFile file, Long providerId) {
        BulkUploadResultDto result = new BulkUploadResultDto();

        // 1. Validate Provider
        Optional<Provider> providerOpt = providerRepository.findById(providerId);
        if (providerOpt.isEmpty()) {
            result.addError("Critical: Invalid Provider ID.");
            return result;
        }
        Provider provider = providerOpt.get();

        try (InputStream inputStream = file.getInputStream();
             Workbook workbook = new XSSFWorkbook(inputStream)) {

            Sheet sheet = workbook.getSheetAt(0);
            Iterator<Row> rows = sheet.iterator();

            int rowNumber = 0;
            while (rows.hasNext()) {
                Row currentRow = rows.next();
                rowNumber++;

                // Skip header row
                if (rowNumber == 1) continue;
                
                // Stop if row is empty
                 if (isRowEmpty(currentRow)) break;

                try {
                    processRow(currentRow, provider, result);
                    result.setSuccessCount(result.getSuccessCount() + 1);
                } catch (Exception e) {
                    result.setFailureCount(result.getFailureCount() + 1);
                    result.addError("Row " + rowNumber + ": " + e.getMessage());
                    log.error("Error processing row " + rowNumber, e);
                }
                result.setProcessedCount(result.getProcessedCount() + 1);
            }

        } catch (IOException e) {
            result.addError("File processing error: " + e.getMessage());
        }

        return result;
    }

    private void processRow(Row row, Provider provider, BulkUploadResultDto result) {
        // Parse Columns
        // 0: Card Number, 1: Service Code, 2: Date (YYYY-MM-DD), 3: Diagnosis, 4: Qty
        
        String cardNumber = getCellStringValue(row.getCell(0));
        String serviceCode = getCellStringValue(row.getCell(1));
        LocalDate serviceDate = getCellDateValue(row.getCell(2));
        String diagnosis = getCellStringValue(row.getCell(3));
        int quantity = getCellIntValue(row.getCell(4), 1);
        
        if (cardNumber == null || serviceCode == null) {
            throw new IllegalArgumentException("Card Number and Service Code are required.");
        }
        if (serviceDate == null) serviceDate = LocalDate.now();

        // 2. Validate Member
        // 2. Validate Member
        List<Member> members = memberRepository.findByCardNumber(cardNumber);
        if (members.isEmpty()) {
            throw new IllegalArgumentException("Member not found with card: " + cardNumber);
        }
        Member member = members.get(0); // Takes the latest member (ordered by ID DESC)
                
        if (member.getStatus() != Member.MemberStatus.ACTIVE) {
             throw new IllegalArgumentException("Member is not ACTIVE.");
        }

        // 3. Validate Service & Price
        MedicalService service = medicalServiceRepository.findByCode(serviceCode)
                .orElseThrow(() -> new IllegalArgumentException("Service code invalid: " + serviceCode));

        // In a real scenario, we check the contract pricing here. 
        // For MVP, we assume a standard price or 150.00
        BigDecimal unitPrice = new BigDecimal("150.00"); 

        // 4. Create Visit (Auto-generated for bulk claim)
        Visit visit = Visit.builder()
                .member(member)
                .providerId(provider.getId())
                .visitDate(serviceDate)
                .status(VisitStatus.CLAIM_SUBMITTED) // Directly to claim submitted
                .visitType(VisitType.OUTPATIENT)
                .diagnosis(diagnosis)
                .employerOrganization(member.getEmployerOrganization()) // Denormalized link
                .build();
        visit = visitRepository.save(visit);

        // 5. Create Claim & Line
        Claim claim = Claim.builder()
                .visit(visit)
                .member(member)
                .providerId(provider.getId())
                .providerName(provider.getName())
                .status(ClaimStatus.SUBMITTED)
                .serviceDate(serviceDate)
                .requestedAmount(unitPrice.multiply(new BigDecimal(quantity))) // Simple calc
                .build();

        ClaimLine line = ClaimLine.builder()
                .medicalService(service)
                .quantity(quantity)
                .unitPrice(unitPrice)
                //.totalPrice() // Calculated in PrePersist
                .build();
        
        claim.addLine(line);
        claimRepository.save(claim);
    }
    
    private boolean isRowEmpty(Row row) {
        if (row == null) return true;
        if (row.getLastCellNum() <= 0) return true;
        Cell cell = row.getCell(0);
        return cell == null || cell.getCellType() == CellType.BLANK || cell.toString().trim().isEmpty();
    }

    private String getCellStringValue(Cell cell) {
        if (cell == null) return null;
        if (cell.getCellType() == CellType.STRING) return cell.getStringCellValue();
        if (cell.getCellType() == CellType.NUMERIC) return String.valueOf((long)cell.getNumericCellValue());
        return null;
    }
    
    private LocalDate getCellDateValue(Cell cell) {
        if (cell == null) return null;
        if (cell.getCellType() == CellType.NUMERIC && DateUtil.isCellDateFormatted(cell)) {
            return cell.getDateCellValue().toInstant().atZone(ZoneId.systemDefault()).toLocalDate();
        }
        return null;
    }
    
    private int getCellIntValue(Cell cell, int defaultValue) {
        if (cell == null) return defaultValue;
        if (cell.getCellType() == CellType.NUMERIC) return (int) cell.getNumericCellValue();
        return defaultValue;
    }
}
