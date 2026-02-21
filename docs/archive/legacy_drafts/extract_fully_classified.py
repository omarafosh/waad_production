import os
import json
import openpyxl
import re
from pathlib import Path

def clean_text(text):
    if text is None: return ""
    text = re.sub(r'\s+', ' ', str(text)).strip()
    return text

def split_code_and_name(text):
    # Try common patterns first
    match = re.match(r'^([A-Z0-9]{1,10}[-\s][0-9]{1,10})\s+(.*)', text)
    if match:
        return match.group(1).strip(), match.group(2).strip()
    return "", text

def extract_bilingual(text):
    # Look for English in brackets
    match_brackets = re.search(r'(.*?)\(([A-Za-z\s/&]+)\)', text)
    if match_brackets:
        return match_brackets.group(1).strip(), match_brackets.group(2).strip()
    # Look for English at the end
    match_end = re.search(r'(.*?)\s+([A-Z]{2,}.*)', text)
    if match_end:
        return match_end.group(1).strip(), match_end.group(2).strip()
    return text, ""

def extract_services():
    base_path = Path(r"d:\Backend\waadTbaSystem2026-main_final\waadTbaSystem2026-main\قائمة الخدمات المعتمدة")
    output_path = Path(r"d:\Backend\waadTbaSystem2026-main_final\waadTbaSystem2026-main\scripts\services_fully_classified.json")
    
    services_list = []
    files = [
        "قائمة اسعار خدمات دار الشفاء مصنفة.xlsx",
        "قائمة اسعار عمليات دار الشفاء مصنفة.xlsx",
        "قائمة مفصلة اسعار مستشفى فينيسيا.xlsx",
        "مركز دنتال لطب الاسنان.xlsx"
    ]
    
    for file_name in files:
        file_path = base_path / file_name
        if not file_path.exists(): continue
            
        print(f"Extracting all fields from {file_name}...")
        try:
            wb = openpyxl.load_workbook(file_path, data_only=True, read_only=True)
            for sheet in wb.worksheets:
                current_section = ""
                for row_idx, row in enumerate(sheet.iter_rows(values_only=True)):
                    if not any(row): continue
                    
                    # Section Header Detection ( Venice style )
                    non_none = [c for c in row if c is not None]
                    if len(non_none) == 1 and isinstance(non_none[0], str) and len(non_none[0]) > 5:
                        if not any(stop in non_none[0] for stop in ["Code", "السعر", "الخدمة"]):
                            current_section = clean_text(non_none[0])
                            continue

                    service_name_raw = ""
                    specialization = current_section
                    classification = ""
                    code = ""
                    
                    if "خدمات دار الشفاء" in file_name:
                        if row_idx < 10: continue
                        # Col 4 (idx 3): Name, Col 5 (idx 4): Specialization, Col 6 (idx 5): Classification
                        service_name_raw = clean_text(row[3])
                        specialization = clean_text(row[4])
                        classification = clean_text(row[5])
                        
                    elif "عمليات دار الشفاء" in file_name:
                        if row_idx < 10: continue
                        # Col 6 (idx 5): Name, Col 13 (idx 12): Specialization, Col 15 (idx 14): Classification
                        service_name_raw = clean_text(row[5])
                        specialization = clean_text(row[12])
                        classification = clean_text(row[14])
                        
                    elif "فينيسيا" in file_name:
                        # Col 1 (idx 0): Code, Col 2 (idx 1): Name, Col 4 (idx 3): Classification
                        if len(row) > 0: code = clean_text(row[0])
                        if len(row) > 1: service_name_raw = clean_text(row[1])
                        if len(row) > 3: classification = clean_text(row[3])
                        
                    elif "مركز دنتال" in file_name:
                        # Col 1 (idx 0): Name, Col 3 (idx 2): Specialization/Classification
                        service_name_raw = clean_text(row[0])
                        specialization = clean_text(row[2])
                        classification = "Dental"

                    if not service_name_raw or any(stop in service_name_raw.lower() for stop in ["خدمة", "العملية", "كشف", "code", "price"]):
                        if not code or code.lower() == "code":
                            continue
                    
                    # Split Code/Name if needed
                    extracted_code, name_part = split_code_and_name(service_name_raw)
                    if not code: code = extracted_code
                    
                    name_ar, name_en = extract_bilingual(name_part)
                    
                    # Store data
                    services_list.append({
                        "id": f"SRV-{len(services_list)+1:05d}",
                        "name_ar": name_ar,
                        "name_en": name_en,
                        "code": code,
                        "specialization": specialization,
                        "classification": classification,
                        "source": file_name
                    })
                        
        except Exception as e:
            print(f"Error in {file_name}: {str(e)}")

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(services_list, f, ensure_ascii=False, indent=2)
    print(f"Final fully classified extraction complete. {len(services_list)} records extracted.")

if __name__ == "__main__":
    extract_services()
