#!/usr/bin/env python3
"""
Analyze Excel pricing file and compare with database services
Helps debug import failures by showing which services are missing
"""
import pandas as pd
import sys
import os

def analyze_excel_file(file_path):
    """Analyze Excel file structure and content"""
    print("=" * 80)
    print("📊 Excel Pricing File Analysis")
    print("=" * 80)
    print(f"File: {file_path}\n")
    
    try:
        # Read Excel file
        df = pd.read_excel(file_path)
        
        print(f"✓ Total rows: {len(df)}")
        print(f"✓ Columns: {list(df.columns)}\n")
        
        # Identify service name column
        service_col = None
        for col in df.columns:
            if 'منتج' in col or 'خدمة' in col or 'service' in col.lower():
                service_col = col
                break
        
        if not service_col:
            print("❌ Could not find service name column!")
            print("   Looking for columns containing: منتج, خدمة, service")
            print(f"   Available columns: {df.columns.tolist()}")
            return
        
        print(f"✓ Service name column: '{service_col}'")
        
        # Identify code column
        code_col = None
        for col in df.columns:
            if 'كود' in col or 'code' in col.lower() or 'رمز' in col:
                code_col = col
                break
        
        if code_col:
            print(f"✓ Service code column: '{code_col}'")
        else:
            print("⚠ No service code column found")
        
        # Identify price column
        price_col = None
        for col in df.columns:
            if 'سعر' in col or 'price' in col.lower():
                price_col = col
                break
        
        if price_col:
            print(f"✓ Price column: '{price_col}'")
        else:
            print("⚠ No price column found")
        
        print("\n" + "=" * 80)
        print("📋 Service Names Analysis")
        print("=" * 80)
        
        # Analyze service names
        services = df[service_col].dropna().unique()
        
        print(f"\nTotal unique services: {len(services)}")
        
        # Language detection
        arabic_only = 0
        english_only = 0
        mixed = 0
        
        for name in services:
            name_str = str(name)
            has_arabic = any('\u0600' <= c <= '\u06FF' for c in name_str)
            has_english = any('a' <= c.lower() <= 'z' for c in name_str)
            
            if has_arabic and not has_english:
                arabic_only += 1
            elif has_english and not has_arabic:
                english_only += 1
            elif has_arabic and has_english:
                mixed += 1
        
        print(f"\nLanguage distribution:")
        print(f"  🇸🇦 Arabic only:  {arabic_only:5d} ({arabic_only/len(services)*100:.1f}%)")
        print(f"  🇬🇧 English only: {english_only:5d} ({english_only/len(services)*100:.1f}%)")
        print(f"  🌐 Mixed:         {mixed:5d} ({mixed/len(services)*100:.1f}%)")
        
        # Show sample names
        print("\n" + "=" * 80)
        print("📝 Sample Service Names (first 20)")
        print("=" * 80)
        
        for i, name in enumerate(services[:20]):
            name_str = str(name)
            has_arabic = any('\u0600' <= c <= '\u06FF' for c in name_str)
            has_english = any('a' <= c.lower() <= 'z' for c in name_str)
            
            if has_arabic and not has_english:
                lang = "🇸🇦"
            elif has_english and not has_arabic:
                lang = "🇬🇧"
            else:
                lang = "🌐"
            
            # Get code if available
            if code_col:
                code = df[df[service_col] == name][code_col].iloc[0] if not df[df[service_col] == name].empty else "N/A"
                print(f"  {i+1:2d}. {lang} [{code}] {name}")
            else:
                print(f"  {i+1:2d}. {lang} {name}")
        
        if len(services) > 20:
            print(f"\n  ... and {len(services) - 20} more services")
        
        # Price statistics
        if price_col:
            print("\n" + "=" * 80)
            print("💰 Price Statistics")
            print("=" * 80)
            
            prices = df[price_col].dropna()
            print(f"  Rows with price: {len(prices)}")
            print(f"  Min price: {prices.min():.2f}")
            print(f"  Max price: {prices.max():.2f}")
            print(f"  Avg price: {prices.mean():.2f}")
            print(f"  Zero prices: {(prices == 0).sum()}")
        
        print("\n" + "=" * 80)
        print("✅ Analysis Complete")
        print("=" * 80)
        
        # Export unique services to text file for comparison
        output_file = file_path.replace('.xlsx', '_services.txt').replace('.xls', '_services.txt')
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write("Service Names from Excel (for DB comparison)\n")
            f.write("=" * 80 + "\n\n")
            for name in sorted(services):
                f.write(f"{name}\n")
        
        print(f"\n📄 Service names exported to: {output_file}")
        print("   Use this file to compare with database services")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python analyze-excel-pricing.py <excel_file>")
        print("\nExample:")
        print('  python analyze-excel-pricing.py "odoo Data اودو بيانات/قائمة أسعار مستشفى دار الحكمة (product.supplierinfo).xlsx"')
        sys.exit(1)
    
    file_path = sys.argv[1]
    
    if not os.path.exists(file_path):
        print(f"❌ File not found: {file_path}")
        sys.exit(1)
    
    analyze_excel_file(file_path)
