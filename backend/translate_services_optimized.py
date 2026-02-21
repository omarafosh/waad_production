import re
import time
from deep_translator import GoogleTranslator
from concurrent.futures import ThreadPoolExecutor
import threading

# Input and Output files
INPUT_FILE = r"d:\Backend\waadTbaSystem2026-main_final\waadTbaSystem2026-main\backend\src\main\resources\db\migration\V13__Seed_Unified_Dictionary.sql"
OUTPUT_FILE = r"d:\Backend\waadTbaSystem2026-main_final\waadTbaSystem2026-main\backend\src\main\resources\db\migration\V13__Seed_Unified_Dictionary_Updated.sql"

# Regex to find the INSERT statement parts
pattern = re.compile(r"(INSERT INTO medical_services .*?VALUES .*?, ')(.*?)', '(Service-WE-.*?)'(, .*?;)")

# Cache for translations to avoid redundant API calls
translation_cache = {}
params_list = []
lines = []

def translate_text(text):
    if text in translation_cache:
        return translation_cache[text]
    try:
        translated = GoogleTranslator(source='ar', target='en').translate(text)
        # Escape single quotes for SQL
        return translated.replace("'", "''")
    except Exception as e:
        print(f"Error translating '{text}': {e}")
        return text

def process_file():
    print("Reading file...")
    with open(INPUT_FILE, 'r', encoding='utf-8') as f:
        global lines
        lines = f.readlines()

    # Identify lines needing translation
    unique_texts = set()
    for i, line in enumerate(lines):
        match = pattern.search(line)
        if match:
            text = match.group(2)
            unique_texts.add(text)
            params_list.append((i, match))

    print(f"Found {len(params_list)} lines to translate with {len(unique_texts)} unique terms.")
    
    # Translate unique terms in parallel
    print("Starting translation...")
    with ThreadPoolExecutor(max_workers=10) as executor:
        results = executor.map(translate_text, unique_texts)
    
    # Fill cache
    for text, translated in zip(unique_texts, results):
        translation_cache[text] = translated
        
    # Apply translations
    print("Applying translations...")
    for i, match in params_list:
        prefix = match.group(1)
        name_ar = match.group(2)
        placeholder_en = match.group(3) # Not used, replaced
        suffix = match.group(4)
        
        translated_name = translation_cache.get(name_ar, name_ar)
        
        # Replace the line
        lines[i] = f"{prefix}{name_ar}', '{translated_name}'{suffix}\n"

    print("Writing output file...")
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        f.writelines(lines)

    print("Done!")

if __name__ == "__main__":
    process_file()
