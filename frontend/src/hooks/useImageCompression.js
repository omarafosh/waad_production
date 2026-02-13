import imageCompression from 'browser-image-compression';
import { useState, useCallback } from 'react';

/**
 * Custom Hook لضغط الصور قبل الرفع
 * يحسن الأداء ويقلل من استهلاك النطاق الترددي
 * 
 * @returns {Object} - دوال ضغط الصور وحالة المعالجة
 */
export const useImageCompression = () => {
    const [isCompressing, setIsCompressing] = useState(false);
    const [compressionError, setCompressionError] = useState(null);

    /**
     * ضغط صورة واحدة
     * @param {File} file - ملف الصورة
     * @param {Object} options - خيارات الضغط
     * @returns {Promise<File>} - الملف المضغوط
     */
    const compressImage = useCallback(async (file, options = {}) => {
        setIsCompressing(true);
        setCompressionError(null);

        const defaultOptions = {
            maxSizeMB: 1, // الحد الأقصى للحجم: 1 ميجابايت
            maxWidthOrHeight: 1920, // الحد الأقصى للعرض أو الارتفاع
            useWebWorker: true, // استخدام Web Worker لتحسين الأداء
            fileType: file.type, // الحفاظ على نوع الملف الأصلي
            ...options
        };

        try {
            const compressedFile = await imageCompression(file, defaultOptions);

            console.log(`✅ Image compressed: ${(file.size / 1024 / 1024).toFixed(2)}MB → ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`);

            setIsCompressing(false);
            return compressedFile;
        } catch (error) {
            console.error('❌ Image compression failed:', error);
            setCompressionError(error.message);
            setIsCompressing(false);

            // في حالة الفشل، إرجاع الملف الأصلي
            return file;
        }
    }, []);

    /**
     * ضغط عدة صور دفعة واحدة
     * @param {File[]} files - مصفوفة من ملفات الصور
     * @param {Object} options - خيارات الضغط
     * @returns {Promise<File[]>} - مصفوفة من الملفات المضغوطة
     */
    const compressImages = useCallback(async (files, options = {}) => {
        setIsCompressing(true);
        setCompressionError(null);

        try {
            const compressedFiles = await Promise.all(
                files.map(file => compressImage(file, options))
            );

            setIsCompressing(false);
            return compressedFiles;
        } catch (error) {
            console.error('❌ Batch image compression failed:', error);
            setCompressionError(error.message);
            setIsCompressing(false);

            // في حالة الفشل، إرجاع الملفات الأصلية
            return files;
        }
    }, [compressImage]);

    /**
     * التحقق من صحة ملف الصورة
     * @param {File} file - ملف الصورة
     * @returns {Object} - نتيجة التحقق
     */
    const validateImage = useCallback((file) => {
        const errors = [];
        const MAX_SIZE = 10 * 1024 * 1024; // 10MB
        const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

        // التحقق من النوع
        if (!ALLOWED_TYPES.includes(file.type)) {
            errors.push('نوع الملف غير مدعوم. الأنواع المسموحة: PNG, JPG, WEBP');
        }

        // التحقق من الحجم
        if (file.size > MAX_SIZE) {
            errors.push('حجم الصورة يجب أن يكون أقل من 10 ميجابايت');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }, []);

    return {
        compressImage,
        compressImages,
        validateImage,
        isCompressing,
        compressionError
    };
};

export default useImageCompression;
