import openpyxl
from pathlib import Path

def inspect_venice_range():
    file_path = Path(r"d:\Backend\waadTbaSystem2026-main_final\waadTbaSystem2026-main\قائمة الخدمات المعتمدة\قائمة مفصلة اسعار مستشفى فينيسيا.xlsx")
    
    wb = openpyxl.load_workbook(file_path, data_only=True, read_only=True)
    sheet = wb["ورقة1"]
    
    # Check rows around 1275 and also search for "تفتيت حصوات"
    print("--- Surrounding Rows (1270-1285) ---")
    for row_idx in range(1270, 1286):
        row = [cell.value for cell in sheet[row_idx]]
        print(f"Row {row_idx}: {row}")
        
    print("\n--- Searching for 'تفتيت حصوات الكلى' ---")
    for row_idx, row in enumerate(sheet.iter_rows(values_only=True), start=1):
        if any(row) and "تفتيت" in str(row):
            print(f"Row {row_idx}: {row}")

if __name__ == "__main__":
    inspect_venice_range()
