import openpyxl
from pathlib import Path

def search_in_excels(search_term):
    base_path = Path(r"d:\Backend\waadTbaSystem2026-main_final\waadTbaSystem2026-main\قائمة الخدمات المعتمدة")
    
    excel_files = list(base_path.glob("*.xlsx"))
    
    for file_path in excel_files:
        print(f"Searching in: {file_path.name}")
        try:
            wb = openpyxl.load_workbook(file_path, data_only=True, read_only=True)
            for sheet in wb.worksheets:
                for row_idx, row in enumerate(sheet.iter_rows(values_only=True), start=1):
                    if any(str(cell) == str(search_term) for cell in row):
                        print(f"  [FOUND] Sheet: {sheet.title}, Row {row_idx}: {row}")
        except Exception as e:
            print(f"  Error: {e}")

if __name__ == "__main__":
    search_in_excels("1950")
