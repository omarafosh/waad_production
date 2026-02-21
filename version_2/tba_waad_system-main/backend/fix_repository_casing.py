import os

files_to_fix = [
    r"src\main\java\com\waad\tba\modules\member\repository\MemberRepository.java",
    r"src\main\java\com\waad\tba\modules\benefitpolicy\repository\BenefitPolicyRepository.java",
    r"src\main\java\com\waad\tba\modules\claim\repository\ClaimRepository.java"
]

base_dir = r"d:\tba_waad_system\backend"

for rel_path in files_to_fix:
    full_path = os.path.join(base_dir, rel_path)
    if os.path.exists(full_path):
        try:
            with open(full_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            new_content = content
            
            # Fix Replacements
            # 1. ByemployerId -> ByEmployerId
            new_content = new_content.replace("ByemployerId", "ByEmployerId")
            
            # 2. AndemployerId -> AndEmployerId
            new_content = new_content.replace("AndemployerId", "AndEmployerId")
            
            # 3. MemberemployerId -> MemberEmployerId (For ClaimRepository specific)
            new_content = new_content.replace("MemberemployerId", "MemberEmployerId")
            
             # 4. Handle possible lingering m.employerOrganization in @Query
            new_content = new_content.replace("m.employerOrganization", "m.employer")

            if content != new_content:
                with open(full_path, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f"Updated: {rel_path}")
            else:
                print(f"No changes needed for: {rel_path}")
                
        except Exception as e:
            print(f"Error processing {rel_path}: {e}")
    else:
        print(f"File not found: {full_path}")
