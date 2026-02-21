import openpyxl
from pathlib import Path

def inspect_dar_alshifa_operations():
    file_path = Path(r"d:\Backend\waadTbaSystem2026-main_final\waadTbaSystem2026-main\قائمة الخدمات المعتمدة\قائمة اسعار عمليات دار الشفاء مصنفة.xlsx")
    
    print(f"--- File: {file_path.name} ---")
    try:
        wb = openpyxl.load_workbook(file_path, data_only=True, read_only=True)
        sheet = wb.active
        for i, row in enumerate(sheet.iter_rows(max_row=50, values_only=True)):
            if any(c is not None for c in row):
                print(f"Row {i+1}: {row}")
    except Exception as e:
        print(f"Error: {str(e)}")

if __name__ == "__main__":
    inspect_dar_alshifa_operations()
