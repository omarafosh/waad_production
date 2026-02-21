package com.waad.tba.modules.member.service.importing;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.waad.tba.common.entity.Organization;
import com.waad.tba.common.excel.service.ExcelParserService;
import com.waad.tba.common.exception.BusinessRuleException;
import com.waad.tba.common.exception.ResourceNotFoundException;
import com.waad.tba.common.repository.OrganizationRepository;
import com.waad.tba.modules.benefitpolicy.entity.BenefitPolicy;
import com.waad.tba.modules.benefitpolicy.repository.BenefitPolicyRepository;
import com.waad.tba.modules.member.dto.*;
import com.waad.tba.modules.member.entity.*;
import com.waad.tba.modules.member.repository.*;
import com.waad.tba.modules.member.service.UnifiedMemberService;
import com.waad.tba.modules.rbac.entity.User;
import com.waad.tba.security.AuthorizationService;
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
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class MemberImportServiceImpl implements MemberImportService {

    private final ExcelParserService parserService;
    private final MemberImportMappingService mappingService;
    private final OrganizationRepository organizationRepository;
    private final BenefitPolicyRepository benefitPolicyRepository;
    private final MemberRepository memberRepository;
    private final MemberImportLogRepository importLogRepository;
    private final MemberImportErrorRepository importErrorRepository;
    private final UnifiedMemberService unifiedMemberService;
    private final AuthorizationService authorizationService;
    private final ObjectMapper objectMapper;
    private final ApplicationContext applicationContext;

    private static final String TEMP_DIR = "temp/imports/members";

    @Override
    @Transactional(readOnly = true)
    public MemberImportPreviewDto previewImport(MultipartFile file) {
        try {
            return generatePreview(file.getInputStream(), file.getOriginalFilename(), null, 0);
        } catch (IOException e) {
            throw new BusinessRuleException("Failed to read Excel file: " + e.getMessage());
        }
    }

    @Override
    @Transactional(readOnly = true)
    public MemberImportPreviewDto previewSavedFile(String fileName) {
        File tempFile = getTempFile(fileName);
        try {
            return generatePreview(Files.newInputStream(tempFile.toPath()), fileName, null, 0);
        } catch (IOException e) {
            throw new BusinessRuleException("Failed to read saved file: " + e.getMessage());
        }
    }

    @Override
    public String saveImportFile(MultipartFile file) {
        try {
            Path dir = Paths.get(TEMP_DIR);
            if (!Files.exists(dir))
                Files.createDirectories(dir);

            String fileName = UUID.randomUUID() + "_" + file.getOriginalFilename();
            Path path = dir.resolve(fileName);
            Files.copy(file.getInputStream(), path);
            return fileName;
        } catch (IOException e) {
            throw new BusinessRuleException("Failed to save import file: " + e.getMessage());
        }
    }

    @Override
    public MemberImportResultDto processImport(String fileName, String mode) {
        File tempFile = getTempFile(fileName);
        String batchId = UUID.randomUUID().toString();
        User currentUser = authorizationService.getCurrentUser();

        // Use self-injection for @Async
        MemberImportServiceImpl self = applicationContext.getBean(MemberImportServiceImpl.class);

        // Initial detection to get column mappings for async process
        MemberImportPreviewDto initialPreview = previewSavedFile(fileName);

        self.executeImportAsync(tempFile, batchId, initialPreview.getColumnMappings(), currentUser);

        return MemberImportResultDto.builder()
                .batchId(batchId)
                .message("لقد بدأت عملية الاستيراد في الخلفية.")
                .status("PROCESSING")
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public MemberImportResultDto getImportStatus(String fileName) {
        return importLogRepository.findByFileName(fileName)
                .map(log -> MemberImportResultDto.builder()
                        .batchId(log.getImportBatchId())
                        .status(log.getStatus().name())
                        .createdCount(log.getCreatedCount())
                        .updatedCount(log.getUpdatedCount())
                        .errorCount(log.getErrorCount())
                        .progress(calculateProgress(log))
                        .build())
                .orElseThrow(() -> new ResourceNotFoundException("Import not found"));
    }

    @Async("taskExecutor")
    public void executeImportAsync(File tempFile, String batchId, Map<String, String> columnMappings,
            User currentUser) {
        MemberImportLog importLog = createImportLog(batchId, tempFile.getName(), tempFile.length(), currentUser);

        try (Workbook workbook = parserService.openWorkbook(tempFile)) {
            Sheet sheet = parserService.getDataSheet(workbook);
            int totalRows = sheet.getLastRowNum();
            Row headerRow = sheet.getRow(0);

            Map<String, Integer> fieldToCol = new HashMap<>();
            columnMappings.forEach((colName, fieldName) -> {
                Integer idx = parserService.findColumnIndex(headerRow, colName);
                if (idx != null)
                    fieldToCol.put(fieldName, idx);
            });

            Map<String, Long> employerCache = new HashMap<>(); // Fuzzy name -> ID
            Map<String, Long> normalizedEmpMap = prepareEmployerLookup();

            int created = 0, updated = 0, skipped = 0, errors = 0;

            for (int i = 1; i <= totalRows; i++) {
                Row row = sheet.getRow(i);
                if (row == null || parserService.isEmptyRow(row))
                    continue;

                try {
                    ImportRowResult result = processRow(row, i, fieldToCol, importLog.getId(), employerCache,
                            normalizedEmpMap);
                    if (result.isCreated())
                        created++;
                    else if (result.isUpdated())
                        updated++;
                    else
                        skipped++;
                } catch (Exception e) {
                    errors++;
                    saveImportError(importLog.getId(), i, e.getMessage(), "{}");
                }
            }

            importLog.markCompleted(created, updated, skipped, errors);
            importLogRepository.save(importLog);
        } catch (Exception e) {
            log.error("Import failed: {}", e.getMessage());
            importLog.markFailed(e.getMessage());
            importLogRepository.save(importLog);
        } finally {
            if (tempFile.exists())
                tempFile.delete();
        }
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public ImportRowResult processRow(Row row, int rowNum, Map<String, Integer> fieldToCol, Long logId,
            Map<String, Long> cache, Map<String, Long> normalizedMap) {
        String fullName = getVal(row, fieldToCol, "fullName");
        String empName = getVal(row, fieldToCol, "employer");
        String civilId = getVal(row, fieldToCol, "civilId");

        if (fullName == null || fullName.isBlank())
            return ImportRowResult.skipped();

        Long empId = cache.computeIfAbsent(empName != null ? empName.trim().toLowerCase() : "", k -> {
            if (empName == null)
                return null;
            return normalizedMap.get(mappingService.normalizeArabicText(empName));
        });

        if (empId == null) {
            saveImportError(logId, rowNum, "Employer not found", "{}");
            return ImportRowResult.skipped();
        }

        Member existing = findExisting(civilId, fullName, empId);
        if (existing != null) {
            updateFields(existing, row, fieldToCol);
            memberRepository.save(existing);
            return ImportRowResult.updated();
        } else {
            MemberCreateDto dto = MemberCreateDto.builder()
                    .fullName(fullName).employerId(empId).civilId(civilId)
                    .cardNumber(getVal(row, fieldToCol, "cardNumber"))
                    .email(getVal(row, fieldToCol, "email"))
                    .phone(getVal(row, fieldToCol, "phone"))
                    .status(Member.MemberStatus.ACTIVE).cardStatus(Member.CardStatus.ACTIVE)
                    .build();
            unifiedMemberService.createPrincipalMember(dto);
            return ImportRowResult.created();
        }
    }

    // Helper Private Methods

    private MemberImportPreviewDto generatePreview(java.io.InputStream is, String fileName,
            Map<String, String> customMappings, int hRow) throws IOException {
        try (Workbook workbook = parserService.openWorkbook(is)) {
            Sheet sheet = parserService.getDataSheet(workbook);
            Row headerRow = sheet.getRow(hRow);

            Map<String, String> mappings = new LinkedHashMap<>();
            Map<String, Integer> fieldToIdx = new HashMap<>();

            for (int i = 0; i < headerRow.getLastCellNum(); i++) {
                String col = parserService.getCellValueAsString(headerRow.getCell(i));
                if (col != null)
                    mappingService.mapColumnToField(col, i, fieldToIdx, mappings);
            }

            return MemberImportPreviewDto.builder()
                    .fileName(fileName)
                    .totalRows(sheet.getLastRowNum())
                    .detectedColumns(new ArrayList<>(mappings.keySet()))
                    .columnMappings(mappings)
                    .previewRows(new ArrayList<>()) // Simplified for brevity as per instructions
                    .build();
        }
    }

    private Map<String, Long> prepareEmployerLookup() {
        Map<String, Long> map = new HashMap<>();
        organizationRepository.findAll()
                .forEach(o -> map.put(mappingService.normalizeArabicText(o.getName()), o.getId()));
        return map;
    }

    private Member findExisting(String civilId, String name, Long empId) {
        if (civilId != null && !civilId.isBlank()) {
            return memberRepository.findByCivilIdAndEmployerOrganizationId(civilId, empId).stream().findFirst()
                    .orElse(null);
        }
        return memberRepository.findByFullNameAndEmployerOrganizationIdAndActiveTrue(name, empId).stream().findFirst()
                .orElse(null);
    }

    private void updateFields(Member m, Row row, Map<String, Integer> fieldToCol) {
        String phone = getVal(row, fieldToCol, "phone");
        if (phone != null)
            m.setPhone(phone);
        String email = getVal(row, fieldToCol, "email");
        if (email != null)
            m.setEmail(email);
    }

    private String getVal(Row row, Map<String, Integer> fieldToCol, String field) {
        Integer idx = fieldToCol.get(field);
        return idx != null ? parserService.getCellValueAsString(row.getCell(idx)) : null;
    }

    private File getTempFile(String fileName) {
        File file = new File(TEMP_DIR, fileName);
        if (!file.exists())
            throw new ResourceNotFoundException("Temporary file not found");
        return file;
    }

    private double calculateProgress(MemberImportLog log) {
        // Logic for progress calculation based on created/updated/error vs total...
        return 0.0;
    }

    private MemberImportLog createImportLog(String batchId, String fileName, long size, User user) {
        MemberImportLog log = MemberImportLog.builder()
                .importBatchId(batchId).fileName(fileName).fileSizeBytes(size)
                .status(MemberImportLog.ImportStatus.PROCESSING)
                .importedByUsername(user != null ? user.getUsername() : "system")
                .build();
        log.markStarted();
        return importLogRepository.save(log);
    }

    private void saveImportError(Long logId, int row, String msg, String data) {
        importLogRepository.findById(logId)
                .ifPresent(l -> importErrorRepository.save(MemberImportError.systemError(l, row, msg, data)));
    }

    private static class ImportRowResult {
        private final boolean created, updated;

        public ImportRowResult(boolean c, boolean u) {
            this.created = c;
            this.updated = u;
        }

        public static ImportRowResult created() {
            return new ImportRowResult(true, false);
        }

        public static ImportRowResult updated() {
            return new ImportRowResult(false, true);
        }

        public static ImportRowResult skipped() {
            return new ImportRowResult(false, false);
        }

        public boolean isCreated() {
            return created;
        }

        public boolean isUpdated() {
            return updated;
        }
    }
}
