import json
import sqlite3 # Or use a dummy for design, but I'll write logic that can be adapted
import difflib
import re

def fuzzy_match(s1, s2):
    return difflib.SequenceMatcher(None, s1, s2).ratio()

def clean_arabic(text):
    if not text: return ""
    # Basic normalization
    text = re.sub(r'[إأآا]', 'ا', text)
    text = re.sub(r'ة', 'ه', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def smart_map(provider_services, master_catalog):
    mappings = []
    
    # Pre-process master catalog for faster lookup
    master_by_code = {m['code']: m for m in master_catalog if m['code']}
    master_by_name_ar = {clean_arabic(m['name_ar']): m for m in master_catalog}
    
    for ps in provider_services:
        ps_name_clean = clean_arabic(ps['service_name'])
        best_match = None
        confidence = 0.0
        match_type = "NONE"
        
        # 1. Exact Code Match
        if ps['service_code'] in master_by_code:
            best_match = master_by_code[ps['service_code']]
            confidence = 1.0
            match_type = "EXACT_CODE"
            
        # 2. Exact Name Match (Normalized Arabic)
        elif ps_name_clean in master_by_name_ar:
            best_match = master_by_name_ar[ps_name_clean]
            confidence = 0.95
            match_type = "EXACT_NAME"
            
        # 3. Fuzzy Name Match
        else:
            # We would typically use a subset based on category if available
            # For this script, we'll demonstrate the logic
            max_ratio = 0.0
            candidate = None
            
            # Simple fuzzy check (in real app, use indexed searching or vector db)
            for m in master_catalog:
                ratio = fuzzy_match(ps_name_clean, clean_arabic(m['name_ar']))
                if ratio > max_ratio and ratio > 0.8: # Threshold
                    max_ratio = ratio
                    candidate = m
            
            if candidate:
                best_match = candidate
                confidence = max_ratio
                match_type = "FUZZY_NAME"
        
        if best_match:
            mappings.append({
                "provider_id": ps['provider_id'],
                "provider_service_code": ps['service_code'],
                "master_service_id": best_match['code'], # or ID
                "confidence": confidence,
                "match_type": match_type,
                "provider_service_name": ps['service_name'],
                "master_service_name": best_match['name_ar']
            })
            
    return mappings

# Demonstration Data
if __name__ == "__main__":
    # Example raw data (would come from DB)
    sample_provider_data = [
        {"provider_id": 1, "service_code": "AMAL-SRV-101", "service_name": "كشف عيادة عامة"},
        {"provider_id": 1, "service_code": "AMAL-SRV-505", "service_name": "تعداد الدم العام"},
    ]
    
    # Load from our generated JSON in Phase 1
    with open('scripts/services_fully_classified.json', 'r', encoding='utf-8') as f:
        master_data = json.load(f)
        
    results = smart_map(sample_provider_data, master_data)
    print(json.dumps(results, ensure_ascii=False, indent=2))
