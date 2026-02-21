
import re
from collections import Counter

file_path = r'd:\Backend\waadTbaSystem2026-main_final\waadTbaSystem2026-main\backend\src\main\resources\db\migration\V13__Seed_Unified_Dictionary.sql'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Extract all categories used in INSERT statements
# Pattern: INSERT INTO medical_services (..., category, ...) VALUES (..., 'CategoryName', ...);
# The regex depends on the position. In V13, it seems to be:
# INSERT INTO medical_services (code, name_ar, name_en, category, sub_category, is_master, active) VALUES ('...', '...', '...', 'CATEGORY', ...
# So category is the 4th string value.

# A loosely based regex to capture the category.
# It assumes the standard format: values ('code', 'name_ar', 'name_en', 'CATEGORY'
pattern = r"VALUES\s*\(\s*(?:'[^']*'|[^,]+)\s*,\s*(?:'[^']*'|[^,]+)\s*,\s*(?:'[^']*'|[^,]+)\s*,\s*'([^']+)'"

categories = re.findall(pattern, content)
unique_categories = Counter(categories)

print("Current Categories in V13 and their counts:")
for cat, count in unique_categories.most_common():
    print(f"- {cat}: {count}")

print("\nTarget 8 Categories:")
targets = [
    'عمليات',
    'إيواء',
    'عيادات خارجية',
    'تحاليل طبية',
    'اسنان وقائي',
    'اسنان تجميلي',
    'اشعة',
    'علاج طبيعي'
]
for t in targets:
    print(f"- {t}")
