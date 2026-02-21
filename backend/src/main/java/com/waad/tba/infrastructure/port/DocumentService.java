package com.waad.tba.infrastructure.port;

import java.io.InputStream;
import java.util.List;
import java.util.Map;

/**
 * واجهة برمجية للتعامل مع المستندات (Excel, PDF).
 * تهدف إلى فك الارتباط بمكتبات مثل Apache POI أو ExcelJS.
 */
public interface DocumentService {

    /**
     * قراءة بيانات من ملف Excel كقائمة من الخرائط (Map).
     * 
     * @param inputStream مصدر الملف
     * @param sheetName اسم الورقة (اختياري)
     * @return قائمة بالصفوف حيث كل صف عبارة عن Map (Header -> Value)
     */
    List<Map<String, String>> readExcel(InputStream inputStream, String sheetName);

    /**
     * إنشاء ملف Excel من قائمة بيانات.
     * 
     * @param data البيانات المراد كتابتها
     * @param sheetName اسم الورقة
     * @return مصفوفة بايتات للملف الناتج
     */
    byte[] createExcel(List<Map<String, Object>> data, String sheetName);
    
    /**
     * التحقق من صيغة ملف Excel.
     * 
     * @param filename اسم الملف
     * @return true إذا كان الملف صالحاً
     */
    boolean isValidExcelFormat(String filename);
}
