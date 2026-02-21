import openpyxl
from pathlib import Path

def inspect_dar_shifa():
    files = [
        "قائمة اسعار خدمات دار الشفاء مصنفة.xlsx",
        "قائمة اسعار عمليات دار الشفاء مصنفة.xlsx"
    ]
    base_path = Path(r"d:\Backend\waadTbaSystem2026-main_final\waadTbaSystem2026-main\قائمة الخدمات المعتمدة")
    
    for file_name in files:
        print(f"--- {file_name} ---")
        wb = openpyxl.load_workbook(base_path / file_name, data_only=True, read_only=True)
        sheet = wb.worksheets[0]
        # Look for the first row with at least 3 non-None values
        count = 0
        for row in sheet.iter_rows(values_only=True):
            non_nones = [c for c in row if c is not None]
            if len(non_nones) > 2:
                print(f"Row {count+1}: {row}")
                count += 1
            if count > 10: break

if __name__ == "__main__":
    inspect_dar_shifa()
