package com.waad.tba.modules.member.service;

import com.waad.tba.common.excel.dto.*;
import com.waad.tba.common.excel.service.SmartColumnMappingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.*;

/**
 * Excel Column Mapping Service for Members
 * 
 * Provides member-specific field definitions and delegates 
 * actual mapping logic to generic SmartColumnMappingService.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ExcelColumnMappingService {

    private final SmartColumnMappingService smartMappingService;

    /**
     * Member-specific field definitions
     */
    private static final List<ExcelFieldDefinition> MEMBER_FIELDS = Arrays.asList(
        ExcelFieldDefinition.builder().fieldName("nationalNumber").labelAr("الرقم الوطني").labelEn("National Number")
            .keywords(Arrays.asList("national number", "national_number", "national id", "civil id", "civilid", "رقم مدني", "رقم", "معرف", "الرقم الوطني", "civil_id")).build(),
        ExcelFieldDefinition.builder().fieldName("fullName").labelAr("الاسم الكامل").labelEn("Full Name")
            .keywords(Arrays.asList("full name", "fullname", "name", "member_name", "اسم", "الاسم", "اسم كامل", "الاسم الكامل", "full_name", "اسم الموظف", "اسم العضو")).required(true).build(),
        ExcelFieldDefinition.builder().fieldName("email").labelAr("البريد الإلكتروني").labelEn("Email")
            .keywords(Arrays.asList("email", "e-mail", "work_email", "email_address", "بريد", "بريد إلكتروني", "ايميل", "البريد الإلكتروني")).build(),
        ExcelFieldDefinition.builder().fieldName("phone").labelAr("رقم الهاتف").labelEn("Phone")
            .keywords(Arrays.asList("phone", "mobile", "tel", "telephone", "mobile_phone", "work_phone", "هاتف", "جوال", "موبايل", "رقم الهاتف", "رقم الجوال")).build(),
        ExcelFieldDefinition.builder().fieldName("dateOfBirth").labelAr("تاريخ الميلاد").labelEn("Date of Birth")
            .keywords(Arrays.asList("dob", "birth date", "date of birth", "birthdate", "تاريخ ميلاد", "ميلاد", "تاريخ الميلاد", "birth_date")).build(),
        ExcelFieldDefinition.builder().fieldName("gender").labelAr("الجنس").labelEn("Gender")
            .keywords(Arrays.asList("gender", "sex", "جنس", "الجنس", "النوع")).build(),
        ExcelFieldDefinition.builder().fieldName("policyNumber").labelAr("رقم البوليصة").labelEn("Policy Number")
            .keywords(Arrays.asList("policy", "policy number", "policy_number", "بوليصة", "رقم بوليصة", "رقم الوثيقة", "الوثيقة")).build(),
        ExcelFieldDefinition.builder().fieldName("employer").labelAr("جهة العمل").labelEn("Employer")
            .keywords(Arrays.asList("employer", "employer id", "company", "company_id", "company_name", "work_company", "organization", "جهة عمل", "جهة العمل", "شركة", "اسم جهة العمل", "المؤسسة", "جهة الانتساب", "صاحب العمل")).required(true).build(),
        ExcelFieldDefinition.builder().fieldName("nationality").labelAr("الجنسية").labelEn("Nationality")
            .keywords(Arrays.asList("nationality", "nation", "country", "جنسية", "الجنسية", "البلد")).build(),
        ExcelFieldDefinition.builder().fieldName("employeeNumber").labelAr("الرقم الوظيفي").labelEn("Employee Number")
            .keywords(Arrays.asList("employee number", "emp number", "badge id", "رقم وظيفي", "الرقم الوظيفي", "employee_number")).build(),
        ExcelFieldDefinition.builder().fieldName("cardNumber").labelAr("رقم البطاقة").labelEn("Card Number")
            .keywords(Arrays.asList("card number", "card_number", "cardnumber", "رقم البطاقة", "رقم العضوية", "membership number")).build()
    );

    /**
     * Detect columns and suggest mappings for member import
     */
    public ExcelColumnDetectionDto detectColumns(MultipartFile file) throws IOException {
        log.info("[MemberMapping] Delegating column detection to SmartMappingService");
        return smartMappingService.detectColumns(file, MEMBER_FIELDS);
    }
}
