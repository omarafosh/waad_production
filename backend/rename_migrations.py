import os

base_dir = r"d:\Backend\waadTbaSystem2026-main_final\waadTbaSystem2026-main\backend\src\main\resources\db\migration"

files_to_rename = {
    "V9005__coverage_priority_config.sql": "V9034__coverage_priority_config.sql",
    "V9005__create_lifecycle_logs.sql": "V9005__create_lifecycle_logs.sql.IGNORED"
}

files_to_delete = [
    "V900116__create_lifecycle_logs.sql"
]

print(f"Working in: {base_dir}")

for old_name, new_name in files_to_rename.items():
    old_path = os.path.join(base_dir, old_name)
    new_path = os.path.join(base_dir, new_name)
    
    if os.path.exists(old_path):
        try:
            if os.path.exists(new_path):
                print(f"Target {new_name} already exists. Deleting it first.")
                os.remove(new_path)
            os.rename(old_path, new_path)
            print(f"Renamed {old_name} -> {new_name}")
        except Exception as e:
            print(f"Error renaming {old_name}: {e}")
    else:
        print(f"File not found: {old_name}")

for file_name in files_to_delete:
    file_path = os.path.join(base_dir, file_name)
    if os.path.exists(file_path):
        try:
            os.remove(file_path)
            print(f"Deleted {file_name}")
        except Exception as e:
            print(f"Error deleting {file_name}: {e}")
    else:
        print(f"File not found for deletion: {file_name}")

print("Done.")
