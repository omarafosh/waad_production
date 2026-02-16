import json
import re
from pathlib import Path

# Mapping table for Arabic categories to system codes
CATEGORY_MAP = {
    "مختبر": "LABS",
    "اشعة": "RADIOLOGY",
    "آشعة": "RADIOLOGY",
    "تخطيط": "DIAGNOSTICS",
    "عيادات": "CONSULTATION",
    "عمليات": "SURGERY",
    "آسنان": "DENTAL",
    "أسنان": "DENTAL",
    "طوارئ": "EMERGENCY",
    "صيدلية": "PHARMACY",
}

# Translation dictionary for common medical terms
TRANSLATIONS = {
    "فحص": "Examination",
    "كشف": "Consultation",
    "تحليل": "Analysis",
    "أشعة": "X-Ray",
    "منظار": "Endoscopy",
    "تخدير": "Anesthesia",
    "جبس": "Casting",
    "غيار": "Dressing",
    "خياطة": "Suturing",
    "ختان": "Circumcision",
    "قسطرة": "Catheterization",
    "سونار": "Ultrasound",
    "تلفزيون": "Ultrasound",
    "دم": "Blood",
    "بول": "Urine",
    "براز": "Stool",
    "مفصل": "Joint",
    "قلب": "Heart",
    "صدر": "Chest",
    "بطن": "Abdomen",
    "عين": "Eye",
    "أذن": "Ear",
    "أنف": "Nose",
    "حنجرة": "Throat",
    "أطفال": "Pediatrics",
    "بساطة": "Simple",
    "متوسط": "Medium",
    "كبير": "Large",
}

def guess_translation(name_ar):
    parts = name_ar.split()
    en_parts = []
    for p in parts:
        clean_p = p.strip("() ")
        if clean_p in TRANSLATIONS:
            en_parts.append(TRANSLATIONS[clean_p])
    return " ".join(en_parts) if en_parts else ""

def generate_unified_dictionary():
    input_path = Path(r"d:\Backend\waadTbaSystem2026-main_final\waadTbaSystem2026-main\scripts\services_refined.json")
    output_path = Path(r"d:\Backend\waadTbaSystem2026-main_final\waadTbaSystem2026-main\unified_bilingual_dictionary.json")
    
    if not input_path.exists():
        print("Input file not found")
        return

    with open(input_path, 'r', encoding='utf-8') as f:
        services = json.load(f)

    unified = []
    for svc in services:
        name_ar = svc["name_ar"]
        name_en = svc["name_en"]
        
        # If no English, try to guess
        if not name_en:
            name_en = guess_translation(name_ar)
            
        # Determine Category Code
        cat_code = "GENERAL"
        for key, code in CATEGORY_MAP.items():
            if key in svc["category"] or key in name_ar:
                cat_code = code
                break
        
        # Determine Service Type (Simplified)
        service_type = "GENERAL"
        if cat_code == "LABS": service_type = "LAB"
        elif cat_code == "RADIOLOGY": service_type = "RAD"
        elif cat_code == "SURGERY": service_type = "SURGERY"
        elif cat_code == "DENTAL": service_type = "DENTAL"
        elif "كشف" in name_ar or "استشارة" in name_ar: service_type = "CONSULTATION"

        unified.append({
            "code": svc["code"] or f"MST-{cat_code}-{len(unified)+1:04d}",
            "name_ar": name_ar,
            "name_en": name_en if name_en else f"{name_ar} (EN Pending)",
            "service_type": service_type,
            "category": cat_code,
            "original_sources": svc["sources"]
        })

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(unified, f, ensure_ascii=False, indent=2)
        
    print(f"Unified dictionary generated: {len(unified)} items")
    print(f"Saved to {output_path}")

if __name__ == "__main__":
    generate_unified_dictionary()
