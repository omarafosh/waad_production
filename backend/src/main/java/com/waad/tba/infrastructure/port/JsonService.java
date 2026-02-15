package com.waad.tba.infrastructure.port;

/**
 * واجهة برمجية للتعامل مع عمليات الـ JSON.
 * تهدف هذه الواجهة إلى فك الارتباط بمكتبة معينة (مثل Jackson).
 */
public interface JsonService {

    /**
     * تحويل كائن إلى نص JSON.
     * 
     * @param object الكائن المراد تحويله
     * @return نص JSON
     */
    String toJson(Object object);

    /**
     * تحويل نص JSON إلى كائن من نوع معين.
     * 
     * @param json نص JSON
     * @param clazz نوع الكائن المستهدف
     * @param <T> النوع العام
     * @return الكائن الناتج
     */
    <T> T fromJson(String json, Class<T> clazz);
    
    /**
     * تحويل كائن من نوع إلى نوع آخر (Deep Copy عبر JSON).
     * 
     * @param from الكائن المصدر
     * @param toValueType النوع المستهدف
     * @param <T> النوع العام
     * @return الكائن الناتج
     */
    <T> T convertValue(Object from, Class<T> clazz);
}
