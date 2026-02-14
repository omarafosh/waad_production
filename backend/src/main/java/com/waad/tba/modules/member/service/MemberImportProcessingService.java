package com.waad.tba.modules.member.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.waad.tba.common.entity.Organization;
import com.waad.tba.common.repository.OrganizationRepository;
import com.waad.tba.modules.member.dto.MemberCreateDto;
import com.waad.tba.modules.member.entity.*;
import com.waad.tba.modules.member.entity.Member.Gender;
import com.waad.tba.modules.member.repository.*;
import com.waad.tba.modules.member.dto.MemberImportResultDto;
import com.waad.tba.modules.rbac.entity.User;
import com.waad.tba.common.excel.service.ExcelParserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.springframework.context.ApplicationContext;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.io.File;
import java.io.FileInputStream;
import java.time.LocalDate;
import java.util.*;

/**
 * Service dedicated to the asynchronous execution of member imports.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MemberImportProcessingService {

    private final MemberRepository memberRepository;
    private final OrganizationRepository organizationRepository;
    private final MemberImportLogRepository importLogRepository;
    private final MemberImportErrorRepository importErrorRepository;
    private final MemberAttributeRepository attributeRepository;
    private final ExcelParserService parserService;
    private final MemberImportMappingService mappingService;
    private final UnifiedMemberService unifiedMemberService;
    private final ObjectMapper objectMapper;
    private final ApplicationContext applicationContext;

    @Async("taskExecutor")
    public void executeImportAsync(File tempFile, String batchId, Map<String, String> columnMappings,
                                   Long globalEmployerId, Long benefitPolicyId, String importPolicy,
                                   User currentUser, Integer headerRowNumber) {
        
        MemberImportProcessingService self = applicationContext.getBean(MemberImportProcessingService.class);
        MemberImportLog importLog = self.createImportLog(batchId, tempFile.getName(), tempFile.length(), currentUser);
        
        int createdCount = 0;
        int updatedCount = 0;
        int skippedCount = 0;
        int errorCount = 0;

        try (Workbook workbook = parserService.openWorkbook(tempFile)) {

            Sheet sheet = parserService.getDataSheet(workbook);
            int totalRows = sheet.getLastRowNum();
            int hRow = headerRowNumber != null ? headerRowNumber : 0;
            Row headerRow = sheet.getRow(hRow);

            Map<String, Integer> fieldToColumnIndex = new HashMap<>();
            Map<Integer, String> columnIndexToName = new HashMap<>();
            
            for (Map.Entry<String, String> entry : columnMappings.entrySet()) {
                Integer colIdx = parserService.findColumnIndex(headerRow, entry.getKey());
                if (colIdx != null) {
                    fieldToColumnIndex.put(entry.getValue(), colIdx);
                    columnIndexToName.put(colIdx, entry.getKey());
                }
            }

            Map<String, Long> employerCache = new HashMap<>();
            Map<String, Long> normalizedEmployerMap = prepareEmployerLookup();

            for (int rowNum = hRow + 1; rowNum <= totalRows; rowNum++) {
                Row row = sheet.getRow(rowNum);
                if (row == null || parserService.isEmptyRow(row)) continue;

                try {
                    ImportRowResult result = self.processRow(row, rowNum, fieldToColumnIndex, columnIndexToName,
                            importLog.getId(), globalEmployerId, benefitPolicyId, importPolicy, employerCache, normalizedEmployerMap);
                    
                    if (result.isCreated()) createdCount++;
                    else if (result.isUpdated()) updatedCount++;
                    else skippedCount++;
                    
                } catch (Exception e) {
                    log.error("Error processing row {}: {}", rowNum, e.getMessage());
                    errorCount++;
                }
            }

            importLog.markCompleted(createdCount, updatedCount, skippedCount, errorCount);
            importLogRepository.save(importLog);

        } catch (Exception e) {
            log.error("Import failed for batch {}: {}", batchId, e.getMessage());
            importLog.markFailed(e.getMessage());
            importLogRepository.save(importLog);
        } finally {
            if (tempFile.exists()) tempFile.delete();
        }
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public ImportRowResult processRow(Row row, int rowNum, Map<String, Integer> fieldToColumnIndex,
                                     Map<Integer, String> columnIndexToName, Long importLogId, 
                                     Long globalEmployerId, Long benefitPolicyId, String importPolicy,
                                     Map<String, Long> employerCache, Map<String, Long> normalizedEmployerMap) {

        Long effectiveEmployerId = globalEmployerId;
        Organization employerOrg = null;

        if (effectiveEmployerId != null) {
            employerOrg = organizationRepository.findById(effectiveEmployerId).orElse(null);
        } else {
            String empName = getFieldValue(row, fieldToColumnIndex, "employer");
            if (empName == null || empName.isBlank()) {
                saveImportError(importLogId, rowNum, "Missing Employer", rowToJson(row, columnIndexToName));
                return ImportRowResult.skipped();
            }
            
            String empKey = empName.trim().toLowerCase();
            effectiveEmployerId = employerCache.computeIfAbsent(empKey, k -> {
                List<Organization> matches = organizationRepository.searchActive(empName);
                if (!matches.isEmpty()) return matches.get(0).getId();
                return normalizedEmployerMap.get(mappingService.normalizeArabicText(empName));
            });

            if (effectiveEmployerId != null) {
                employerOrg = organizationRepository.findById(effectiveEmployerId).orElse(null);
            }
        }

        if (employerOrg == null) {
            saveImportError(importLogId, rowNum, "Employer not found", rowToJson(row, columnIndexToName));
            return ImportRowResult.skipped();
        }

        String fullName = getFieldValue(row, fieldToColumnIndex, "fullName");
        String civilId = getFieldValue(row, fieldToColumnIndex, "civilId");
        if (fullName == null || fullName.isBlank()) return ImportRowResult.skipped();

        Member existing = findExistingMember(civilId, fullName, effectiveEmployerId, fieldToColumnIndex, row);
        
        if (existing != null) {
            if ("SKIP".equalsIgnoreCase(importPolicy)) return ImportRowResult.skipped();
            updateMemberFields(existing, row, fieldToColumnIndex);
            memberRepository.save(existing);
            return ImportRowResult.updated();
        } else {
            MemberCreateDto createDto = MemberCreateDto.builder()
                    .fullName(fullName).employerId(effectiveEmployerId).benefitPolicyId(benefitPolicyId)
                    .status(Member.MemberStatus.ACTIVE).cardStatus(Member.CardStatus.ACTIVE).active(true)
                    .employeeNumber(getFieldValue(row, fieldToColumnIndex, "employeeNumber")).civilId(civilId)
                    .phone(getFieldValue(row, fieldToColumnIndex, "phone")).email(getFieldValue(row, fieldToColumnIndex, "email"))
                    .cardNumber(getFieldValue(row, fieldToColumnIndex, "cardNumber"))
                    .build();
            
            unifiedMemberService.createPrincipalMember(createDto);
            return ImportRowResult.created();
        }
    }

    private Member findExistingMember(String civilId, String fullName, Long employerId, Map<String, Integer> fieldToColumnIndex, Row row) {
        if (civilId != null && !civilId.isBlank()) {
            List<Member> matches = memberRepository.findByCivilIdAndEmployerOrganizationId(civilId, employerId);
            if (!matches.isEmpty()) return matches.get(0);
        }
        String empNo = getFieldValue(row, fieldToColumnIndex, "employeeNumber");
        if (empNo != null && !empNo.isBlank()) {
            List<Member> matches = memberRepository.findByEmployeeNumberAndEmployerOrganizationId(empNo, employerId);
            if (!matches.isEmpty()) return matches.get(0);
        }
        return null; // Simplified: usually would also use name matching caches
    }

    private void updateMemberFields(Member m, Row row, Map<String, Integer> fieldToColumnIndex) {
        String phone = getFieldValue(row, fieldToColumnIndex, "phone");
        if (phone != null && !phone.isBlank()) m.setPhone(phone);
        String email = getFieldValue(row, fieldToColumnIndex, "email");
        if (email != null && !email.isBlank()) m.setEmail(email);
        
        String bDate = getFieldValue(row, fieldToColumnIndex, "birthDate");
        if (bDate != null && !bDate.isBlank()) {
            try { m.setBirthDate(LocalDate.parse(bDate)); } catch (Exception e) {}
        }
        
        String gender = getFieldValue(row, fieldToColumnIndex, "gender");
        if (gender != null && !gender.isBlank()) m.setGender(parseGender(gender));
    }

    private Gender parseGender(String v) {
        if (v == null) return Gender.UNDEFINED;
        String s = v.toLowerCase().trim();
        if (s.contains("male") || s.contains("ذكر")) return Gender.MALE;
        if (s.contains("female") || s.contains("أنثى")) return Gender.FEMALE;
        return Gender.UNDEFINED;
    }

    private Map<String, Long> prepareEmployerLookup() {
        Map<String, Long> map = new HashMap<>();
        organizationRepository.findAll().forEach(org -> map.put(mappingService.normalizeArabicText(org.getName()), org.getId()));
        return map;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public MemberImportLog createImportLog(String batchId, String fileName, long fileSize, User currentUser) {
        MemberImportLog log = MemberImportLog.builder()
                .importBatchId(batchId).fileName(fileName).fileSizeBytes(fileSize)
                .status(MemberImportLog.ImportStatus.PROCESSING)
                .importedByUserId(currentUser != null ? currentUser.getId() : null)
                .importedByUsername(currentUser != null ? currentUser.getUsername() : "system")
                .build();
        log.markStarted();
        return importLogRepository.save(log);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void saveImportError(Long logId, int rowNum, String message, String rowData) {
        importLogRepository.findById(logId).ifPresent(log -> 
            importErrorRepository.save(MemberImportError.systemError(log, rowNum, message, rowData)));
    }

    private String getFieldValue(Row row, Map<String, Integer> fieldToColumnIndex, String field) {
        Integer idx = fieldToColumnIndex.get(field);
        return idx != null ? parserService.getCellValueAsString(row.getCell(idx)) : null;
    }

    private String rowToJson(Row row, Map<Integer, String> colMap) {
        Map<String, String> data = new HashMap<>();
        colMap.forEach((idx, name) -> data.put(name, parserService.getCellValueAsString(row.getCell(idx))));
        try { return objectMapper.writeValueAsString(data); } catch (JsonProcessingException e) { return "{}"; }
    }

    public static class ImportRowResult {
        private final boolean created, updated, skipped;
        public ImportRowResult(boolean c, boolean u, boolean s) { created = c; updated = u; skipped = s; }
        public static ImportRowResult created() { return new ImportRowResult(true, false, false); }
        public static ImportRowResult updated() { return new ImportRowResult(false, true, false); }
        public static ImportRowResult skipped() { return new ImportRowResult(false, false, true); }
        public boolean isCreated() { return created; }
        public boolean isUpdated() { return updated; }
    }
}
