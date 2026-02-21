import os
import json
import openpyxl
import re
from pathlib import Path

def clean_text(text):
    if not text:
        return ""
    # Remove excessive whitespace
    text = re.sub(r'\s+', ' ', str(text)).strip()
    return text

def split_code_and_name(text):
    # Pattern for codes like WE-001 or standard prefixes
    # Matches patterns like AA-000, XXX 111, etc at the start
    match = re.match(r'^([A-Z0-9]{1,10}[-\s][0-9]{1,10})\s+(.*)', text)
    if match:
        return match.group(1).strip(), match.group(2).strip()
    return "", text

def extract_bilingual(text):
    # Look for patterns where English text is at the end or in brackets
    # e.g. "فحص طبي (Medical Exam)" or "فحص طبي Medical Exam"
    
    # Check for brackets
    match_brackets = re.search(r'(.*)\(([A-Za-z\s/]+)\)', text)
    if match_brackets:
        name_ar = match_brackets.group(1).strip()
        name_en = match_brackets.group(2).strip()
        return name_ar, name_en
    
    # Check for English at the end
    match_end = re.search(r'(.*?)([A-Z]{2,}.*)', text)
    if match_end:
        name_ar = match_end.group(1).strip()
        name_en = match_end.group(2).strip()
        if name_ar: # Only if there was Arabic before it
            return name_ar, name_en
            
    return text, ""

def extract_services():
    base_path = Path(r"d:\Backend\waadTbaSystem2026-main_final\waadTbaSystem2026-main\قائمة الخدمات المعتمدة")
    output_path = Path(r"d:\Backend\waadTbaSystem2026-main_final\waadTbaSystem2026-main\scripts\services_refined.json")
    
    services = {}
    
    files = [
        "قائمة اسعار خدمات دار الشفاء مصنفة.xlsx",
        "قائمة اسعار عمليات دار الشفاء مصنفة.xlsx",
        "قائمة مفصلة اسعار مستشفى فينيسيا.xlsx",
        "مركز دنتال لطب الاسنان.xlsx"
    ]
    
    for file_name in files:
        file_path = base_path / file_name
        if not file_path.exists():
            continue
            
        print(f"Refining {file_name}...")
        try:
            wb = openpyxl.load_workbook(file_path, data_only=True)
            for sheet in wb.worksheets:
                for row in sheet.iter_rows(min_row=2, values_only=True):
                    if not any(row): continue
                    
                    # Heuristic for service name: usually the first non-numeric cell or specific column
                    raw_name = ""
                    for cell in row:
                        val = clean_text(cell)
                        if val and not val.replace('.', '').isdigit() and len(val) > 2:
                            raw_name = val
                            break
                    
                    if not raw_name or raw_name.lower() in ["السعر", "price", "اسم الخدمة", "service"]:
                        continue
                        
                    code, name_part = split_code_and_name(raw_name)
                    name_ar, name_en = extract_bilingual(name_part)
                    
                    unique_key = f"{name_ar}|{name_en}".strip("|")
                    
                    if unique_key not in services:
                        services[unique_key] = {
                            "name_ar": name_ar,
                            "name_en": name_en,
                            "codes": set(),
                            "category": sheet.title, # Use sheet name as temporary category
                            "sources": set()
                        }
                    
                    if code: services[unique_key]["codes"].add(code)
                    services[unique_key]["sources"].add(file_name)
                        
        except Exception as e:
            print(f"Error: {str(e)}")

    # Final list conversion
    final_list = []
    for key, data in services.items():
        item = {
            "name_ar": data["name_ar"],
            "name_en": data["name_en"],
            "code": sorted(list(data["codes"]))[0] if data["codes"] else "",
            "category": data["category"],
            "sources": list(data["sources"])
        }
        final_list.append(item)

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(final_list, f, ensure_ascii=False, indent=2)
        
    print(f"Refinement complete. {len(final_list)} unique services.")

if __name__ == "__main__":
    extract_services()
