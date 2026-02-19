import openpyxl
from pathlib import Path

def inspect_excel_deep():
    base_path = Path(r"d:\Backend\waadTbaSystem2026-main_final\waadTbaSystem2026-main\قائمة الخدمات المعتمدة")
    
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
            
        print(f"--- File: {file_name} ---")
        try:
            wb = openpyxl.load_workbook(file_path, data_only=True, read_only=True)
            for sheet in wb.worksheets:
                print(f"Sheet: {sheet.title}")
                # Take first 20 rows
                rows = list(sheet.iter_rows(max_row=20, values_only=True))
                for i, row in enumerate(rows):
                    # Filter out purely None rows for display but keep index
                    if any(c is not None for c in row):
                        print(f"Row {i+1}: {row}")
                print("\n")
        except Exception as e:
            print(f"Error: {str(e)}")

if __name__ == "__main__":
    inspect_excel_deep()
