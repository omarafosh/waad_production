# 🚀 إضافة الشعار - دليل سريع

## الطريقة الأسهل (موصى بها)

### 1️⃣ تثبيت psycopg2

```bash
pip install psycopg2-binary
```

### 2️⃣ تحديث الإعدادات

افتح: `backend/add_logo_to_database.py`

عدّل السطور 13-18:

```python
DB_CONFIG = {
    'host': 'localhost',
    'port': 5432,
    'database': 'tba_waad',  # اسم قاعدة البيانات
    'user': 'postgres',      # اسم المستخدم  
    'password': 'postgres'   # كلمة المرور
}
```

### 3️⃣ تشغيل

```bash
cd /workspaces/tba_waad_system/backend
python3 add_logo_to_database.py
```

### 4️⃣ اختبار

```bash
# شغّل السيرفر
mvn spring-boot:run

# في terminal آخر
curl -X GET "http://localhost:8080/api/pdf/reports/claims/sample" -o test.pdf
xdg-open test.pdf
```

## ✅ تم!

الشعار سيظهر الآن في:
- ✅ كل صفحة من التقرير
- ✅ الهيدر في الأعلى
- ✅ جميع أنواع التقارير

## 📚 دليل كامل

راجع: [LOGO-SETUP-GUIDE.md](LOGO-SETUP-GUIDE.md)
- 4 طرق مختلفة
- حل المشاكل
- التخصيص
