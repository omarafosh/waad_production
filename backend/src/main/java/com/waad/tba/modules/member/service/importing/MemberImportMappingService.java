package com.waad.tba.modules.member.service.importing;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;

/**
 * Service dedicated to mapping Excel columns and normalizing Arabic text for
 * member imports.
 * Part of the unified importing package.
 */
@Slf4j
@Service
public class MemberImportMappingService {

    public static final List<String[]> MANDATORY_COLUMNS = List.of(
            new String[] {
                    "full_name", "name", "fullname", "member_name",
                    "الاسم الكامل", "الاسم", "اسم الموظف", "اسم العضو",
                    "الاسم الثلاثي", "الاسم الرباعي", "اسم المؤمن عليه"
            },
            new String[] {
                    "جهة العمل", "employer",
                    "company", "company_id", "company_name", "employer_name",
                    "work_company", "organization", "employer_code",
                    "الشركة", "اسم الشركة", "المؤسسة", "جهة الانتساب",
                    "صاحب العمل", "الجهة", "مكان العمل", "كود الجهة"
            });

    public static final Map<String, String[]> OPTIONAL_FIELD_MAPPINGS = Map.ofEntries(
            Map.entry("civilId", new String[] {
                    "national_id", "identification_id", "civil_id", "civilid", "national_number",
                    "id_number", "identity_number",
                    "الرقم الوطني", "رقم الهوية", "الرقم المدني", "رقم البطاقة الشخصية",
                    "رقم الهوية الوطنية"
            }),
            Map.entry("cardNumber", new String[] {
                    "card_number", "cardnumber", "card number", "member_no", "member_number",
                    "insurance_no", "insurance_number", "membership_no", "membership_number",
                    "barcode", "badge_id", "employee_id",
                    "رقم البطاقة", "رقم العضوية", "رقم التأمين", "رقم العضو", "رقم بطاقة التأمين",
                    "الباركود", "رقم الشارة"
            }),
            Map.entry("birthDate", new String[] {
                    "birth_date", "birthday", "dob", "date_of_birth", "birthdate",
                    "تاريخ الميلاد", "تاريخ الولادة", "الميلاد"
            }),
            Map.entry("gender", new String[] {
                    "gender", "sex",
                    "الجنس", "النوع"
            }),
            Map.entry("phone", new String[] {
                    "phone", "mobile", "mobile_phone", "work_phone", "phone_number",
                    "telephone", "tel", "cell", "cellphone",
                    "الهاتف", "الجوال", "رقم الهاتف", "رقم الجوال", "هاتف العمل",
                    "الموبايل", "رقم التواصل"
            }),
            Map.entry("email", new String[] {
                    "email", "work_email", "email_address", "e_mail",
                    "البريد الإلكتروني", "الإيميل", "البريد"
            }),
            Map.entry("nationality", new String[] {
                    "nationality", "country", "country_id",
                    "الجنسية", "البلد"
            }),
            Map.entry("employeeNumber", new String[] {
                    "employee_number", "employee_id", "badge_id", "barcode", "emp_no",
                    "employee_code", "staff_id",
                    "رقم الموظف", "الرقم الوظيفي", "رقم العمل", "كود الموظف"
            }),
            Map.entry("address", new String[] {
                    "address", "home_address", "street", "location",
                    "العنوان", "عنوان السكن", "الموقع"
            }),
            Map.entry("maritalStatus", new String[] {
                    "marital_status", "marital", "status_marital",
                    "الحالة الاجتماعية", "الحالة الزوجية"
            }));

    public static final Map<String, String[]> ATTRIBUTE_MAPPINGS = Map.ofEntries(
            Map.entry("job_title", new String[] {
                    "job_title", "job_id", "job", "position", "title", "job_position",
                    "الوظيفة", "المسمى الوظيفي", "المنصب", "الدرجة الوظيفية"
            }),
            Map.entry("department", new String[] {
                    "department", "department_id", "dept", "division", "section",
                    "القسم", "الإدارة", "الوحدة", "الفرع"
            }),
            Map.entry("work_location", new String[] {
                    "work_location", "work_location_id", "location", "office", "branch",
                    "موقع العمل", "مكان العمل", "الفرع", "المكتب"
            }),
            Map.entry("grade", new String[] {
                    "grade", "x_grade", "level", "rank", "class",
                    "الدرجة", "المستوى", "الرتبة", "الفئة"
            }),
            Map.entry("manager", new String[] {
                    "manager", "parent_id", "manager_name", "supervisor", "direct_manager",
                    "المدير", "المسؤول", "المدير المباشر"
            }),
            Map.entry("cost_center", new String[] {
                    "cost_center", "x_cost_center", "cost_code",
                    "مركز التكلفة", "رمز التكلفة"
            }),
            Map.entry("start_date", new String[] {
                    "start_date", "join_date", "hire_date", "employment_date",
                    "تاريخ البداية", "تاريخ الالتحاق", "تاريخ التعيين"
            }),
            Map.entry("end_date", new String[] {
                    "end_date", "termination_date", "leave_date",
                    "تاريخ النهاية", "تاريخ الانتهاء"
            }),
            Map.entry("benefit_class", new String[] {
                    "benefit_class", "class", "coverage_class", "plan_class",
                    "فئة المنافع", "فئة التغطية", "الفئة"
            }),
            Map.entry("notes", new String[] {
                    "notes", "remarks", "comment", "comments",
                    "ملاحظات", "تعليقات"
            }));

    public String normalizeArabicText(String text) {
        if (text == null)
            return "";

        String input = text.replace("\uFEFF", "")
                .replace('\u00A0', ' ')
                .replace('\u200B', ' ')
                .replace("\u0640", "");

        String normalized = input.trim().replaceAll("\\s+", " ");

        normalized = normalized.replace('\u0623', '\u0627')
                .replace('\u0625', '\u0627')
                .replace('\u0622', '\u0627');

        normalized = normalized.replace('\u0629', '\u0647');

        normalized = normalized.replace('\u0649', '\u064A')
                .replace('\u06CC', '\u064A')
                .replace('\u064A', '\u064A')
                .replace('\u06A9', '\u0643');

        normalized = normalized.replaceAll("[\u064B-\u0652\u0653\u0654\u0655\u0670]", "");
        normalized = normalized.replace('\u0671', '\u0627');

        return normalized.toLowerCase().trim();
    }

    public void mapColumnToField(String colName, int index,
            Map<String, Integer> fieldToColumnIndex, Map<String, String> columnMappings) {

        String baseCleaned = colName.replace("\uFEFF", "")
                .replace('\u00A0', ' ')
                .replace('\u200B', ' ')
                .trim();

        Set<String> candidates = new LinkedHashSet<>();
        candidates.add(baseCleaned);

        String[] lines = baseCleaned.split("[\\r\\n]+");
        for (String line : lines) {
            candidates.add(line.trim());
        }

        List<String> rawCandidates = new ArrayList<>(candidates);
        for (String c : rawCandidates) {
            if (c.contains("*")) {
                candidates.add(c.replace("*", "").trim());
            }
            String deeplyCleaned = c.replaceAll("[*\\(\\):\\-_]", " ").replaceAll("\\s+", " ").trim();
            if (!deeplyCleaned.isEmpty() && !deeplyCleaned.equals(c)) {
                candidates.add(deeplyCleaned);
            }
        }

        // 1. Mandatory Columns
        for (int i = 0; i < MANDATORY_COLUMNS.size(); i++) {
            String fieldName = i == 0 ? "fullName" : "employer";
            for (String variant : MANDATORY_COLUMNS.get(i)) {
                for (String candidate : candidates) {
                    if (candidate.equalsIgnoreCase(variant) ||
                            normalizeArabicText(candidate).equals(normalizeArabicText(variant))) {
                        fieldToColumnIndex.put(fieldName, index);
                        columnMappings.put(colName, fieldName);
                        return;
                    }
                }
            }
        }

        // 2. Optional Columns
        for (Map.Entry<String, String[]> entry : OPTIONAL_FIELD_MAPPINGS.entrySet()) {
            for (String variant : entry.getValue()) {
                for (String candidate : candidates) {
                    if (candidate.equalsIgnoreCase(variant) ||
                            normalizeArabicText(candidate).equals(normalizeArabicText(variant))) {
                        fieldToColumnIndex.put(entry.getKey(), index);
                        columnMappings.put(colName, entry.getKey());
                        return;
                    }
                }
            }
        }

        // 3. Attributes
        for (Map.Entry<String, String[]> entry : ATTRIBUTE_MAPPINGS.entrySet()) {
            for (String variant : entry.getValue()) {
                for (String candidate : candidates) {
                    if (candidate.equalsIgnoreCase(variant) ||
                            normalizeArabicText(candidate).equals(normalizeArabicText(variant))) {
                        fieldToColumnIndex.put(entry.getKey(), index);
                        columnMappings.put(colName, entry.getKey());
                        return;
                    }
                }
            }
        }

        String bestCandidate = baseCleaned.replace("*", "").trim();
        String normalized = bestCandidate.replaceAll("[^a-z0-9_]", "_").replaceAll("_+", "_");

        if (!normalized.isBlank()) {
            fieldToColumnIndex.put("attr:" + normalized, index);
            columnMappings.put(colName, "attribute:" + normalized);
        }
    }
}
