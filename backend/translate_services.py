import re
import time
from deep_translator import GoogleTranslator

# Input and Output files
INPUT_FILE = r"d:\Backend\waadTbaSystem2026-main_final\waadTbaSystem2026-main\backend\src\main\resources\db\migration\V13__Seed_Unified_Dictionary.sql"
OUTPUT_FILE = r"d:\Backend\waadTbaSystem2026-main_final\waadTbaSystem2026-main\backend\src\main\resources\db\migration\V13__Seed_Unified_Dictionary_Updated.sql"

# Regex to find the INSERT statement parts
# Pattern: INSERT INTO medical_services (code, name_ar, name_en, ...) VALUES ('...', 'ARABIC_NAME', 'Service-WE-XXX', ...);
pattern = re.compile(r"(INSERT INTO medical_services .*?VALUES .*?, ')(.*?)', '(Service-WE-.*?)'(, .*?;)")

translator = GoogleTranslator(source='ar', target='en')

def translate_file():
    with open(INPUT_FILE, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        count = 0
        for line in lines:
            match = pattern.search(line)
            if match:
                prefix = match.group(1)
                name_ar = match.group(2)
                placeholder_en = match.group(3)
                suffix = match.group(4)

                try:
                    # Translate
                    translated_name = translator.translate(name_ar)
                    # Simple cleaning of the translated name (e.g. remove quotes if any)
                    translated_name = translated_name.replace("'", "''")
                    
                    # Construct new line
                    new_line = f"{prefix}{name_ar}', '{translated_name}'{suffix}\n"
                    f.write(new_line)
                    
                    print(f"Translated: {name_ar} -> {translated_name}")
                    count += 1
                    
                    # Be nice to the API
                    if count % 10 == 0:
                        time.sleep(1)
                        
                except Exception as e:
                    print(f"Error translating '{name_ar}': {e}")
                    f.write(line) # Write original line on error
            else:
                f.write(line)

    print(f"Done! Translated {count} items.")

if __name__ == "__main__":
    translate_file()
