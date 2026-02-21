import os

migration_dir = r"d:\Backend\waadTbaSystem2026-main_final\waadTbaSystem2026-main\backend\src\main\resources\db\migration"

files_to_delete = [
    "V12__create_system_admin_tables.sql",
    "V13__Fix_Approval_Requests.sql"
]

renames = {
    "V13__consolidated_fixes.sql": "V13_2__consolidated_fixes.sql"
}

print(f"Starting cleanup in {migration_dir}")

for filename in files_to_delete:
    path = os.path.join(migration_dir, filename)
    if os.path.exists(path):
        try:
            os.remove(path)
            print(f"Deleted: {filename}")
        except Exception as e:
            print(f"Error deleting {filename}: {e}")
    else:
        print(f"File not found: {filename}")

for old_name, new_name in renames.items():
    old_path = os.path.join(migration_dir, old_name)
    new_path = os.path.join(migration_dir, new_name)
    if os.path.exists(old_path):
        try:
            os.rename(old_path, new_path)
            print(f"Renamed: {old_name} -> {new_name}")
        except Exception as e:
            print(f"Error renaming {old_name}: {e}")
    else:
        print(f"File not found for rename: {old_name}")

print("Cleanup script finished.")
