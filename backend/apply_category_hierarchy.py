
import re

file_path = r'd:\Backend\waadTbaSystem2026-main_final\waadTbaSystem2026-main\backend\src\main\resources\db\migration\V13__Seed_Unified_Dictionary.sql'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Define the Mapping (Sub-Category -> Main Category)
# Based on the analysis and proposal
mapping = {
    # 1. عمليات (Operations)
    'الجراحة العامة': 'عمليات',
    'الجراحات العامه': 'عمليات',
    'جراحة العظام': 'عمليات',
    '1-عمليات العظام': 'عمليات',
    'خدمات العظام': 'عمليات', # Could be ortho clinic, but let's assume procedures based on context 'عمليات'
    'جراحة الوجه والفكين': 'عمليات',
    'جراحة المسالك والأمراض التناسلية': 'عمليات',
    'جراحة المخ والأعصاب': 'عمليات',
    'جراحة القلب': 'عمليات',
    'CARDIOLOGY': 'عمليات', # Proposal put it here
    'جراحة الصدر': 'عمليات',
    'جراحة الأطفال': 'عمليات',
    'جراحات الاطفال': 'عمليات',
    'جراحة التجميل': 'عمليات',
    'خدمات جراحة التجميل': 'عمليات',
    'جراحات وخدمات التجميل والحروق': 'عمليات',
    '2-عمليات المفاصل': 'عمليات',
    'عمليات المفاصل': 'عمليات',
    '3-عمليات الانسجه الرخوه': 'عمليات',
    'عمليات الكتف': 'عمليات',
    '4-عمليات عظام الاطفال والتشوهات الخلقيه وعمليات اخرى': 'عمليات',
    'المناظير': 'عمليات',
    'خدمات المناظير': 'عمليات',
    'تفتيت حصوات الكلى': 'عمليات',
    'خدمات الجراحة': 'عمليات',
    'عمليات جراحيه بسيطه بالعيادات الخارجيه': 'عمليات',
    'جراحات الأنف والأذن والحنجره': 'عمليات',
    'جراحات الكلى والمسالك': 'عمليات',
    'جراحات الصدر': 'عمليات',
    'مناظير الجهاز الهضمى التشخيصيه والعلاجيه': 'عمليات',
    'خدمات جراحة الصدر': 'عمليات',
    'تفتيت حصوات الكلى بالموجات التصادمية LITHOTRIPSY': 'عمليات',

    # 2. إيواء (Inpatient)
    'خدمات الرعاية بالعناية المركزه': 'إيواء',
    'خدمات الايواء': 'إيواء',
    'التخدير': 'إيواء',
    'خدمات التخذير': 'إيواء',
    'خدمات الرعايه الطبيه': 'إيواء', # General medical care often implies inpatient/obs
    'تخدير وعناية فائقة': 'إيواء',
    
    # 3. عيادات خارجية (Outpatient)
    'الكشف و الاستشارات الطبية': 'عيادات خارجية',
    'خدمات العيادات الخارجية': 'عيادات خارجية',
    'خدمات الطوارئ': 'عيادات خارجية',
    'أمراض العيون': 'عيادات خارجية',
    'خدمات العيون': 'عيادات خارجية',
    'أنف وأذن وحنجرة': 'عيادات خارجية',
    'خدمات الأنف والأذن والحنجرة': 'عيادات خارجية',
    'خدمات الاذن والانف والحنجرة': 'عيادات خارجية',
    'النساء وولادة': 'عيادات خارجية',
    'خدمات النساء والاولادة': 'عيادات خارجية',
    'العقم و الخصوبة': 'عيادات خارجية',
    'الجهاز الهضمي والمناظير': 'عيادات خارجية',
    'خدمات غسيل الُكلى': 'عيادات خارجية',
    'خدمات جلسات الغسيل': 'عيادات خارجية',
    'خدمات العلاج الكيماوي': 'عيادات خارجية',
    
    # 4. تحاليل طبية (Laboratory)
    'معامل': 'تحاليل طبية',
    'معمل التحاليل': 'تحاليل طبية',
    
    # 5. اشعة (Radiology)
    'اشعة': 'اشعة',
    'التصويربالأشعه الرقميه': 'اشعة',
    'خدمات الصور التشخيصية': 'اشعة',
    'خدمات الموجات الفوق صوتية': 'اشعة',
    'خدمات تخطيط العصب': 'اشعة', # Neurophysiology, often grouped with diagnostic
    'وسائل تشخيصيه وخدمات مسانده': 'اشعة',

    # 6. اسنان وقائي (Preventive Dentistry)
    'خدمات الأسنان': 'اسنان وقائي',
    'الأسنان': 'اسنان وقائي',
    'اسنان وقائي': 'اسنان وقائي',
    
    # 7. اسنان تجميلي (Cosmetic Dentistry)
    'اسنان تجميلي': 'اسنان تجميلي',
    
    # 8. علاج طبيعي (Physical Therapy)
    'خدمات العلاج الطبيعي': 'علاج طبيعي',
}

# Regex to match INSERT line and extract current category
# INSERT INTO medical_services (code, name_ar, name_en, category, sub_category, ...) VALUES (..., 'CATEGORY', 'SUB', ...)
# Based on V13 structure:
# INSERT INTO medical_services (code, name_ar, name_en, category, sub_category, is_master, active) VALUES ('MED-...', 'Name AR', 'Name EN', 'OLD_CATEGORY', 'OLD_SUB', ...);

pattern = r"(INSERT INTO medical_services\s*\(code,\s*name_ar,\s*name_en,\s*category,\s*sub_category,\s*is_master,\s*active\)\s*VALUES\s*\(\s*'[^']+'\s*,\s*'[^']+'\s*,\s*(?:'[^']*'|NULL)\s*,\s*)'([^']+)'(\s*,\s*)(?:'([^']*)'|NULL)(.*)"

def replacer(match):
    prefix = match.group(1)
    old_cat = match.group(2)
    middle_sep = match.group(3)
    old_sub = match.group(4) if match.group(4) else ""
    suffix = match.group(5)
    
    # Determine new Main Category
    new_main = mapping.get(old_cat, 'عيادات خارجية') # Default fallback
    
    # Determine new Sub Category (The old category becomes the sub)
    # If old_sub existed, maybe append? But user said "The 60 categories are sub categories"
    # So we prefer the old_cat as the new sub_category.
    new_sub = old_cat
    
    return f"{prefix}'{new_main}'{middle_sep}'{new_sub}'{suffix}"

new_content = re.sub(pattern, replacer, content)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Successfully applied category hierarchy.")
