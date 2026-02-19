#!/usr/bin/env python3
"""
TBA-WAAD Medical Entities Database Schema Analyzer
====================================================

سكريبت PySpark لتحليل كيانات قاعدة البيانات الطبية والعقود

المسارات المستهدفة:
1. medicalcode - أكواد ICD/CPT الطبية
2. medicalpackage - الباقات الطبية
3. medicaltaxonomy - التصنيفات والخدمات الطبية
4. benefitpolicy - وثائق المنافع وقواعد التغطية
5. providercontract - عقود مقدمي الخدمات

الإخراج:
- JSON شامل بجميع الكيانات والعلاقات
- CSV لكل جدول بالأعمدة والأنواع
- تقرير علاقات الكيانات

تاريخ الإنشاء: 2026-01-14
"""

import os
import re
import json
import csv
from pathlib import Path
from dataclasses import dataclass, field, asdict
from typing import List, Dict, Optional, Set
from datetime import datetime

# ============================================================================
# DATA CLASSES
# ============================================================================

@dataclass
class ColumnInfo:
    """معلومات العمود في الجدول"""
    name: str
    java_type: str
    sql_type: str = ""
    nullable: bool = True
    is_primary_key: bool = False
    is_unique: bool = False
    is_foreign_key: bool = False
    foreign_table: str = ""
    foreign_column: str = ""
    default_value: str = ""
    column_name_db: str = ""  # اسم العمود في قاعدة البيانات
    max_length: int = 0
    precision: int = 0
    scale: int = 0
    description_ar: str = ""
    used_for_pricing: bool = False
    used_for_coverage: bool = False
    used_for_linking: bool = False

@dataclass
class IndexInfo:
    """معلومات الفهرس"""
    name: str
    columns: List[str]
    unique: bool = False

@dataclass
class EntityInfo:
    """معلومات الكيان/الجدول"""
    entity_name: str
    table_name: str
    module: str
    package_path: str
    file_path: str
    columns: List[ColumnInfo] = field(default_factory=list)
    indexes: List[IndexInfo] = field(default_factory=list)
    unique_constraints: List[Dict] = field(default_factory=list)
    description_ar: str = ""
    description_en: str = ""
    has_frontend: bool = True
    notes: str = ""
    relationships: List[Dict] = field(default_factory=list)

@dataclass
class RelationshipInfo:
    """معلومات العلاقة بين الكيانات"""
    source_entity: str
    source_column: str
    target_entity: str
    target_column: str
    relationship_type: str  # OneToMany, ManyToOne, ManyToMany, OneToOne
    description_ar: str = ""

# ============================================================================
# JAVA TYPE TO SQL TYPE MAPPING
# ============================================================================

JAVA_TO_SQL_TYPE = {
    "Long": "BIGINT",
    "Integer": "INTEGER",
    "int": "INTEGER",
    "String": "VARCHAR",
    "Boolean": "BOOLEAN",
    "boolean": "BOOLEAN",
    "BigDecimal": "DECIMAL",
    "Double": "DOUBLE",
    "double": "DOUBLE",
    "Float": "FLOAT",
    "float": "FLOAT",
    "LocalDate": "DATE",
    "LocalDateTime": "TIMESTAMP",
    "LocalTime": "TIME",
    "Instant": "TIMESTAMP",
    "Date": "TIMESTAMP",
    "byte[]": "BLOB",
    "UUID": "UUID",
}

# ============================================================================
# MODULE DESCRIPTIONS (Arabic)
# ============================================================================

MODULE_DESCRIPTIONS = {
    "medicalcode": {
        "ar": "أكواد التشخيص والإجراءات الطبية (ICD-10, CPT)",
        "en": "Medical diagnosis and procedure codes",
        "has_frontend": False,
        "note": "هذه الأكواد موجودة في الباك‌اند لكنها لا تظهر في واجهة المستخدم حالياً"
    },
    "medicalpackage": {
        "ar": "الباقات الطبية - مجموعات خدمات بسعر موحد",
        "en": "Medical packages - bundled services with unified pricing",
        "has_frontend": True,
        "note": ""
    },
    "medicaltaxonomy": {
        "ar": "التصنيفات والخدمات الطبية - البنية الهرمية للخدمات",
        "en": "Medical taxonomy - hierarchical service structure",
        "has_frontend": True,
        "note": ""
    },
    "benefitpolicy": {
        "ar": "وثائق المنافع وقواعد التغطية التأمينية",
        "en": "Benefit policies and coverage rules",
        "has_frontend": True,
        "note": ""
    },
    "providercontract": {
        "ar": "عقود مقدمي الخدمات الصحية وأسعارها",
        "en": "Healthcare provider contracts and pricing",
        "has_frontend": True,
        "note": ""
    }
}

# ============================================================================
# ENTITY ANALYZER CLASS
# ============================================================================

class EntityAnalyzer:
    """محلل كيانات JPA"""
    
    def __init__(self, base_path: str):
        self.base_path = Path(base_path)
        self.entities: Dict[str, EntityInfo] = {}
        self.relationships: List[RelationshipInfo] = []
        
    def analyze_all_modules(self, modules: List[str]) -> Dict:
        """تحليل جميع الوحدات المحددة"""
        for module in modules:
            module_path = self.base_path / module
            if module_path.exists():
                self._analyze_module(module, module_path)
        
        # Extract relationships after all entities are parsed
        self._extract_all_relationships()
        
        return {
            "entities": {k: asdict(v) for k, v in self.entities.items()},
            "relationships": [asdict(r) for r in self.relationships],
            "summary": self._generate_summary()
        }
    
    def _analyze_module(self, module_name: str, module_path: Path):
        """تحليل وحدة واحدة"""
        print(f"[Analyzing] Module: {module_name}")
        
        # Find entity files
        entity_dir = module_path / "entity"
        if entity_dir.exists():
            for java_file in entity_dir.glob("*.java"):
                self._analyze_entity_file(module_name, java_file)
        else:
            # Some modules have entity in root (like MedicalPackage)
            for java_file in module_path.glob("*.java"):
                if self._is_entity_file(java_file):
                    self._analyze_entity_file(module_name, java_file)
    
    def _is_entity_file(self, file_path: Path) -> bool:
        """التحقق إذا كان الملف entity"""
        content = file_path.read_text(encoding='utf-8')
        return "@Entity" in content
    
    def _analyze_entity_file(self, module_name: str, file_path: Path):
        """تحليل ملف entity واحد"""
        content = file_path.read_text(encoding='utf-8')
        
        if "@Entity" not in content:
            return
        
        entity_name = file_path.stem
        print(f"  [Entity] {entity_name}")
        
        # Extract table name
        table_name = self._extract_table_name(content, entity_name)
        
        # Create entity info
        module_info = MODULE_DESCRIPTIONS.get(module_name, {})
        entity = EntityInfo(
            entity_name=entity_name,
            table_name=table_name,
            module=module_name,
            package_path=f"com.waad.tba.modules.{module_name}",
            file_path=str(file_path),
            description_ar=self._get_entity_description_ar(entity_name),
            description_en=self._get_entity_description_en(entity_name),
            has_frontend=module_info.get("has_frontend", True),
            notes=module_info.get("note", "")
        )
        
        # Extract columns
        entity.columns = self._extract_columns(content, entity_name)
        
        # Extract indexes
        entity.indexes = self._extract_indexes(content)
        
        # Extract unique constraints
        entity.unique_constraints = self._extract_unique_constraints(content)
        
        self.entities[entity_name] = entity
    
    def _extract_table_name(self, content: str, default_name: str) -> str:
        """استخراج اسم الجدول من @Table"""
        # Match @Table(name = "xxx") or @Table(name="xxx")
        match = re.search(r'@Table\s*\([^)]*name\s*=\s*["\']([^"\']+)["\']', content)
        if match:
            return match.group(1)
        # Convert CamelCase to snake_case
        return re.sub(r'(?<!^)(?=[A-Z])', '_', default_name).lower()
    
    def _extract_columns(self, content: str, entity_name: str) -> List[ColumnInfo]:
        """استخراج جميع الأعمدة من الكيان"""
        columns = []
        
        # Split by field declarations
        # Pattern: annotations followed by private/protected TYPE fieldName
        field_pattern = re.compile(
            r'((?:@\w+(?:\([^)]*\))?\s*)*)'  # Annotations
            r'private\s+'
            r'(\w+(?:<[^>]+>)?)\s+'  # Type (including generics)
            r'(\w+)\s*'  # Field name
            r'(?:=\s*([^;]+))?;',  # Optional default value
            re.MULTILINE
        )
        
        for match in field_pattern.finditer(content):
            annotations = match.group(1) or ""
            java_type = match.group(2)
            field_name = match.group(3)
            default_value = match.group(4) or ""
            
            # Skip transient, static, or collection fields for now
            if "@Transient" in annotations or "static" in annotations:
                continue
            
            # Skip relationship collections (handled separately)
            if java_type.startswith("List<") or java_type.startswith("Set<"):
                continue
            
            column = self._parse_column(annotations, java_type, field_name, default_value, entity_name)
            if column:
                columns.append(column)
        
        return columns
    
    def _parse_column(self, annotations: str, java_type: str, field_name: str, 
                      default_value: str, entity_name: str) -> Optional[ColumnInfo]:
        """تحليل عمود واحد"""
        column = ColumnInfo(
            name=field_name,
            java_type=java_type,
            sql_type=JAVA_TO_SQL_TYPE.get(java_type, "VARCHAR"),
            default_value=default_value.strip() if default_value else ""
        )
        
        # Check for @Id
        if "@Id" in annotations:
            column.is_primary_key = True
            column.nullable = False
        
        # Check for @Column
        col_match = re.search(r'@Column\s*\(([^)]+)\)', annotations)
        if col_match:
            col_attrs = col_match.group(1)
            
            # Column name
            name_match = re.search(r'name\s*=\s*["\']([^"\']+)["\']', col_attrs)
            if name_match:
                column.column_name_db = name_match.group(1)
            
            # Nullable
            if "nullable = false" in col_attrs or "nullable=false" in col_attrs:
                column.nullable = False
            
            # Unique
            if "unique = true" in col_attrs or "unique=true" in col_attrs:
                column.is_unique = True
            
            # Length
            len_match = re.search(r'length\s*=\s*(\d+)', col_attrs)
            if len_match:
                column.max_length = int(len_match.group(1))
            
            # Precision/Scale
            prec_match = re.search(r'precision\s*=\s*(\d+)', col_attrs)
            if prec_match:
                column.precision = int(prec_match.group(1))
            scale_match = re.search(r'scale\s*=\s*(\d+)', col_attrs)
            if scale_match:
                column.scale = int(scale_match.group(1))
        
        # Check for @NotNull, @NotBlank, @NotEmpty
        if any(x in annotations for x in ["@NotNull", "@NotBlank", "@NotEmpty"]):
            column.nullable = False
        
        # Check for @ManyToOne, @OneToOne (foreign key)
        if "@ManyToOne" in annotations or "@OneToOne" in annotations:
            column.is_foreign_key = True
            column.used_for_linking = True
            
            # Extract target entity from type
            column.foreign_table = java_type
            
            # Extract join column
            join_match = re.search(r'@JoinColumn\s*\([^)]*name\s*=\s*["\']([^"\']+)["\']', annotations)
            if join_match:
                column.column_name_db = join_match.group(1)
                column.foreign_column = "id"  # Usually id
        
        # Set column name if not set
        if not column.column_name_db:
            column.column_name_db = re.sub(r'(?<!^)(?=[A-Z])', '_', field_name).lower()
        
        # Determine usage
        column.description_ar = self._get_column_description_ar(field_name, entity_name)
        column.used_for_pricing = self._is_pricing_field(field_name)
        column.used_for_coverage = self._is_coverage_field(field_name)
        column.used_for_linking = column.is_foreign_key or self._is_linking_field(field_name)
        
        return column
    
    def _extract_indexes(self, content: str) -> List[IndexInfo]:
        """استخراج الفهارس"""
        indexes = []
        
        # Match @Index annotations
        index_pattern = re.compile(
            r'@Index\s*\(\s*name\s*=\s*["\']([^"\']+)["\']'
            r'\s*,\s*columnList\s*=\s*["\']([^"\']+)["\']'
        )
        
        for match in index_pattern.finditer(content):
            idx_name = match.group(1)
            columns = [c.strip() for c in match.group(2).split(",")]
            indexes.append(IndexInfo(name=idx_name, columns=columns))
        
        return indexes
    
    def _extract_unique_constraints(self, content: str) -> List[Dict]:
        """استخراج قيود التفرد"""
        constraints = []
        
        # Match @UniqueConstraint
        uc_pattern = re.compile(
            r'@UniqueConstraint\s*\(\s*name\s*=\s*["\']([^"\']+)["\']'
            r'\s*,\s*columnNames\s*=\s*\{([^}]+)\}'
        )
        
        for match in uc_pattern.finditer(content):
            name = match.group(1)
            cols_str = match.group(2)
            columns = re.findall(r'["\']([^"\']+)["\']', cols_str)
            constraints.append({"name": name, "columns": columns})
        
        return constraints
    
    def _extract_all_relationships(self):
        """استخراج جميع العلاقات بين الكيانات"""
        for entity_name, entity in self.entities.items():
            file_path = Path(entity.file_path)
            content = file_path.read_text(encoding='utf-8')
            
            # ManyToOne relationships
            for match in re.finditer(r'@ManyToOne.*?private\s+(\w+)\s+(\w+)', content, re.DOTALL):
                target_entity = match.group(1)
                field_name = match.group(2)
                
                self.relationships.append(RelationshipInfo(
                    source_entity=entity_name,
                    source_column=field_name,
                    target_entity=target_entity,
                    target_column="id",
                    relationship_type="ManyToOne",
                    description_ar=f"{entity_name} ينتمي إلى {target_entity}"
                ))
                
                entity.relationships.append({
                    "type": "ManyToOne",
                    "target": target_entity,
                    "field": field_name
                })
            
            # OneToMany relationships
            for match in re.finditer(r'@OneToMany.*?private\s+(?:List|Set)<(\w+)>\s+(\w+)', content, re.DOTALL):
                target_entity = match.group(1)
                field_name = match.group(2)
                
                self.relationships.append(RelationshipInfo(
                    source_entity=entity_name,
                    source_column=field_name,
                    target_entity=target_entity,
                    target_column="",
                    relationship_type="OneToMany",
                    description_ar=f"{entity_name} له عدة {target_entity}"
                ))
                
                entity.relationships.append({
                    "type": "OneToMany",
                    "target": target_entity,
                    "field": field_name
                })
    
    def _generate_summary(self) -> Dict:
        """توليد ملخص التحليل"""
        return {
            "total_entities": len(self.entities),
            "total_relationships": len(self.relationships),
            "modules_analyzed": list(set(e.module for e in self.entities.values())),
            "entities_without_frontend": [
                e.entity_name for e in self.entities.values() if not e.has_frontend
            ],
            "pricing_related_entities": [
                e.entity_name for e in self.entities.values()
                if any(c.used_for_pricing for c in e.columns)
            ],
            "coverage_related_entities": [
                e.entity_name for e in self.entities.values()
                if any(c.used_for_coverage for c in e.columns)
            ],
            "analysis_timestamp": datetime.now().isoformat()
        }
    
    # ========================================================================
    # HELPER METHODS - DESCRIPTIONS
    # ========================================================================
    
    def _get_entity_description_ar(self, entity_name: str) -> str:
        """الحصول على وصف الكيان بالعربي"""
        descriptions = {
            "MedicalCategory": "التصنيف الطبي - الفئة الرئيسية للخدمات الطبية",
            "MedicalService": "الخدمة الطبية - خدمة فردية ضمن تصنيف معين",
            "MedicalPackage": "الباقة الطبية - مجموعة خدمات بسعر موحد",
            "BenefitPolicy": "وثيقة المنافع - تحدد التغطية التأمينية للمؤمن عليهم",
            "BenefitPolicyRule": "قاعدة وثيقة المنافع - تحدد حدود التغطية لكل خدمة/تصنيف",
            "ProviderContract": "عقد مقدم الخدمة - الاتفاق بين شركة التأمين ومقدم الخدمة",
            "ProviderContractPricingItem": "بند تسعير العقد - سعر خدمة محددة ضمن عقد",
            "IcdCode": "كود ICD-10 - رموز التشخيص الطبي العالمية",
            "CptCode": "كود CPT - رموز الإجراءات الطبية العالمية",
        }
        return descriptions.get(entity_name, "")
    
    def _get_entity_description_en(self, entity_name: str) -> str:
        """الحصول على وصف الكيان بالإنجليزية"""
        descriptions = {
            "MedicalCategory": "Medical Category - Main classification for medical services",
            "MedicalService": "Medical Service - Individual service within a category",
            "MedicalPackage": "Medical Package - Bundled services with unified pricing",
            "BenefitPolicy": "Benefit Policy - Defines insurance coverage for members",
            "BenefitPolicyRule": "Benefit Policy Rule - Coverage limits per service/category",
            "ProviderContract": "Provider Contract - Agreement between insurer and provider",
            "ProviderContractPricingItem": "Contract Pricing Item - Service price within contract",
            "IcdCode": "ICD-10 Code - International disease classification codes",
            "CptCode": "CPT Code - Current Procedural Terminology codes",
        }
        return descriptions.get(entity_name, "")
    
    def _get_column_description_ar(self, field_name: str, entity_name: str) -> str:
        """الحصول على وصف العمود بالعربي"""
        common_descriptions = {
            "id": "المعرف الفريد",
            "name": "الاسم بالعربية",
            "nameEn": "الاسم بالإنجليزية",
            "code": "الرمز",
            "description": "الوصف",
            "active": "نشط/فعال",
            "createdAt": "تاريخ الإنشاء",
            "updatedAt": "تاريخ التحديث",
            "createdBy": "أنشأ بواسطة",
            "updatedBy": "حُدث بواسطة",
            "basePrice": "السعر الأساسي",
            "contractPrice": "سعر العقد",
            "discountPercent": "نسبة الخصم",
            "coveragePercent": "نسبة التغطية",
            "maxAmount": "الحد الأقصى للمبلغ",
            "deductible": "المبلغ المقتطع",
            "copay": "الدفع المشترك",
            "coinsurance": "التأمين المشترك",
            "waitingPeriod": "فترة الانتظار",
            "effectiveFrom": "تاريخ السريان من",
            "effectiveTo": "تاريخ السريان إلى",
            "startDate": "تاريخ البداية",
            "endDate": "تاريخ النهاية",
            "status": "الحالة",
            "notes": "ملاحظات",
            "unit": "الوحدة",
            "currency": "العملة",
            "quantity": "الكمية",
            "serviceName": "اسم الخدمة",
        }
        return common_descriptions.get(field_name, "")
    
    def _is_pricing_field(self, field_name: str) -> bool:
        """هل الحقل متعلق بالتسعير"""
        pricing_keywords = [
            "price", "amount", "cost", "fee", "charge", "rate",
            "discount", "markup", "margin", "total"
        ]
        return any(kw in field_name.lower() for kw in pricing_keywords)
    
    def _is_coverage_field(self, field_name: str) -> bool:
        """هل الحقل متعلق بالتغطية"""
        coverage_keywords = [
            "coverage", "limit", "max", "min", "deductible", "copay",
            "coinsurance", "waiting", "exclusion", "percent"
        ]
        return any(kw in field_name.lower() for kw in coverage_keywords)
    
    def _is_linking_field(self, field_name: str) -> bool:
        """هل الحقل للربط"""
        linking_keywords = ["Id", "category", "service", "policy", "contract", "provider"]
        return any(kw in field_name for kw in linking_keywords)


# ============================================================================
# OUTPUT GENERATORS
# ============================================================================

def generate_json_report(analysis: Dict, output_path: str):
    """توليد تقرير JSON"""
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(analysis, f, ensure_ascii=False, indent=2)
    print(f"[Output] JSON report saved to: {output_path}")

def generate_csv_reports(analysis: Dict, output_dir: str):
    """توليد تقارير CSV"""
    os.makedirs(output_dir, exist_ok=True)
    
    # 1. Entities summary CSV
    entities_csv = os.path.join(output_dir, "entities_summary.csv")
    with open(entities_csv, 'w', encoding='utf-8-sig', newline='') as f:
        writer = csv.writer(f)
        writer.writerow([
            "Entity Name", "Table Name", "Module", "Description (AR)",
            "Has Frontend", "Column Count", "Notes"
        ])
        for entity in analysis["entities"].values():
            writer.writerow([
                entity["entity_name"],
                entity["table_name"],
                entity["module"],
                entity["description_ar"],
                "نعم" if entity["has_frontend"] else "لا",
                len(entity["columns"]),
                entity["notes"]
            ])
    print(f"[Output] Entities summary saved to: {entities_csv}")
    
    # 2. Columns CSV for each entity
    for entity_name, entity in analysis["entities"].items():
        columns_csv = os.path.join(output_dir, f"columns_{entity_name}.csv")
        with open(columns_csv, 'w', encoding='utf-8-sig', newline='') as f:
            writer = csv.writer(f)
            writer.writerow([
                "Column Name", "DB Column", "Java Type", "SQL Type",
                "Nullable", "Primary Key", "Unique", "Foreign Key",
                "Foreign Table", "Max Length", "Default Value",
                "Description (AR)", "For Pricing", "For Coverage", "For Linking"
            ])
            for col in entity["columns"]:
                writer.writerow([
                    col["name"],
                    col["column_name_db"],
                    col["java_type"],
                    col["sql_type"],
                    "نعم" if col["nullable"] else "لا",
                    "نعم" if col["is_primary_key"] else "لا",
                    "نعم" if col["is_unique"] else "لا",
                    "نعم" if col["is_foreign_key"] else "لا",
                    col["foreign_table"],
                    col["max_length"] if col["max_length"] > 0 else "",
                    col["default_value"],
                    col["description_ar"],
                    "نعم" if col["used_for_pricing"] else "",
                    "نعم" if col["used_for_coverage"] else "",
                    "نعم" if col["used_for_linking"] else ""
                ])
        print(f"[Output] Columns CSV for {entity_name} saved")
    
    # 3. Relationships CSV
    relationships_csv = os.path.join(output_dir, "relationships.csv")
    with open(relationships_csv, 'w', encoding='utf-8-sig', newline='') as f:
        writer = csv.writer(f)
        writer.writerow([
            "Source Entity", "Source Column", "Target Entity", 
            "Relationship Type", "Description (AR)"
        ])
        for rel in analysis["relationships"]:
            writer.writerow([
                rel["source_entity"],
                rel["source_column"],
                rel["target_entity"],
                rel["relationship_type"],
                rel["description_ar"]
            ])
    print(f"[Output] Relationships saved to: {relationships_csv}")

def generate_markdown_report(analysis: Dict, output_path: str):
    """توليد تقرير Markdown"""
    lines = []
    lines.append("# تقرير تحليل الكيانات الطبية - نظام TBA-WAAD")
    lines.append(f"\n**تاريخ التحليل:** {analysis['summary']['analysis_timestamp']}")
    lines.append(f"\n**عدد الكيانات:** {analysis['summary']['total_entities']}")
    lines.append(f"\n**عدد العلاقات:** {analysis['summary']['total_relationships']}")
    
    lines.append("\n---\n")
    lines.append("## ملخص الوحدات\n")
    
    for module in analysis['summary']['modules_analyzed']:
        info = MODULE_DESCRIPTIONS.get(module, {})
        lines.append(f"### {module}")
        lines.append(f"- **الوصف:** {info.get('ar', '')}")
        lines.append(f"- **يظهر في الواجهة:** {'نعم' if info.get('has_frontend', True) else 'لا'}")
        if info.get('note'):
            lines.append(f"- **ملاحظة:** {info.get('note')}")
        lines.append("")
    
    lines.append("\n---\n")
    lines.append("## تفاصيل الكيانات\n")
    
    for entity_name, entity in analysis["entities"].items():
        lines.append(f"### {entity_name}")
        lines.append(f"- **جدول قاعدة البيانات:** `{entity['table_name']}`")
        lines.append(f"- **الوحدة:** {entity['module']}")
        lines.append(f"- **الوصف:** {entity['description_ar']}")
        lines.append(f"- **يظهر في الواجهة:** {'نعم' if entity['has_frontend'] else 'لا'}")
        if entity['notes']:
            lines.append(f"- **ملاحظة:** {entity['notes']}")
        
        lines.append("\n#### الأعمدة:\n")
        lines.append("| العمود | نوع البيانات | إلزامي | مفتاح أساسي | مفتاح خارجي | الوصف |")
        lines.append("|--------|-------------|--------|------------|------------|-------|")
        
        for col in entity["columns"]:
            nullable = "❌" if col["nullable"] else "✅"
            pk = "🔑" if col["is_primary_key"] else ""
            fk = f"→ {col['foreign_table']}" if col["is_foreign_key"] else ""
            lines.append(f"| {col['name']} | {col['java_type']} | {nullable} | {pk} | {fk} | {col['description_ar']} |")
        
        if entity["relationships"]:
            lines.append("\n#### العلاقات:\n")
            for rel in entity["relationships"]:
                lines.append(f"- **{rel['type']}** → `{rel['target']}` (عبر `{rel['field']}`)")
        
        lines.append("\n---\n")
    
    lines.append("## خريطة العلاقات\n")
    lines.append("```")
    for rel in analysis["relationships"]:
        arrow = "──►" if rel["relationship_type"] == "ManyToOne" else "──≫"
        lines.append(f"{rel['source_entity']}.{rel['source_column']} {arrow} {rel['target_entity']}")
    lines.append("```\n")
    
    lines.append("## الكيانات المتعلقة بالتسعير\n")
    for entity_name in analysis["summary"]["pricing_related_entities"]:
        lines.append(f"- {entity_name}")
    
    lines.append("\n## الكيانات المتعلقة بالتغطية\n")
    for entity_name in analysis["summary"]["coverage_related_entities"]:
        lines.append(f"- {entity_name}")
    
    lines.append("\n## الكيانات غير الظاهرة في الواجهة\n")
    for entity_name in analysis["summary"]["entities_without_frontend"]:
        lines.append(f"- {entity_name}")
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))
    print(f"[Output] Markdown report saved to: {output_path}")


# ============================================================================
# MAIN EXECUTION
# ============================================================================

def main():
    """النقطة الرئيسية للتنفيذ"""
    print("=" * 60)
    print("TBA-WAAD Medical Entities Database Schema Analyzer")
    print("=" * 60)
    
    # Configuration
    base_path = Path("/workspaces/tba_waad_system/backend/src/main/java/com/waad/tba/modules")
    output_dir = Path("/workspaces/tba_waad_system/scripts/analysis_output")
    
    modules_to_analyze = [
        "medicalcode",
        "medicalpackage", 
        "medicaltaxonomy",
        "benefitpolicy",
        "providercontract"
    ]
    
    # Create output directory
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Analyze
    analyzer = EntityAnalyzer(str(base_path))
    analysis = analyzer.analyze_all_modules(modules_to_analyze)
    
    # Generate outputs
    print("\n" + "=" * 60)
    print("Generating Reports...")
    print("=" * 60)
    
    generate_json_report(analysis, str(output_dir / "medical_entities_analysis.json"))
    generate_csv_reports(analysis, str(output_dir / "csv"))
    generate_markdown_report(analysis, str(output_dir / "medical_entities_report.md"))
    
    # Print summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"Total Entities Analyzed: {analysis['summary']['total_entities']}")
    print(f"Total Relationships Found: {analysis['summary']['total_relationships']}")
    print(f"Modules: {', '.join(analysis['summary']['modules_analyzed'])}")
    print(f"\nEntities without Frontend UI:")
    for e in analysis['summary']['entities_without_frontend']:
        print(f"  - {e}")
    print(f"\nPricing-related Entities:")
    for e in analysis['summary']['pricing_related_entities']:
        print(f"  - {e}")
    print(f"\nCoverage-related Entities:")
    for e in analysis['summary']['coverage_related_entities']:
        print(f"  - {e}")
    
    print("\n" + "=" * 60)
    print(f"Output saved to: {output_dir}")
    print("=" * 60)

if __name__ == "__main__":
    main()
