import Compressor from 'compressorjs';
import { useState, useCallback } from 'react';

export interface ImageCompressionHook {
    isCompressing: boolean;
    compressionError: string | null;
    compressImage: (file: File, options?: Compressor.Options) => Promise<File>;
    compressImages: (files: File[] | FileList, options?: Compressor.Options) => Promise<File[]>;
    validateImage: (file: File) => { isValid: boolean; errors: string[] };
}

/**
 * Custom Hook لضغط الصور قبل الرفع باستخدام Compressor.js
 * يحسن الأداء ويقلل من استهلاك النطاق الترددي
 * 
 * @returns {ImageCompressionHook} - دوال ضغط الصور وحالة المعالجة
 */
export const useImageCompression = (): ImageCompressionHook => {
    const [isCompressing, setIsCompressing] = useState(false);
    const [compressionError, setCompressionError] = useState<string | null>(null);

    /**
     * ضغط صورة واحدة
     * @param {File} file - ملف الصورة
     * @param {Compressor.Options} options - خيارات الضغط
     * @returns {Promise<File>} - الملف المضغوط
     */
    const compressImage = useCallback((file: File, options: Compressor.Options = {}): Promise<File> => {
        return new Promise((resolve, reject) => {
            setIsCompressing(true);
            setCompressionError(null);

            // خيارات افتراضية للأداء والجودة
            const defaultOptions: Compressor.Options = {
                quality: 0.8,
                maxWidth: 1920,
                maxHeight: 1920,
                mimeType: 'image/jpeg', // تحويل إلى JPEG لتقليل الحجم بشكل أفضل
                convertSize: 5000000, // تحويل الصور الأكبر من 5MB إلى JPEG تلقائياً
                success(result: File | Blob) {
                    // Compressor returns a Blob/File
                    console.log(`✅ Image compressed: ${(file.size / 1024 / 1024).toFixed(2)}MB → ${(result.size / 1024 / 1024).toFixed(2)}MB`);
                    setIsCompressing(false);

                    // تأكد من أن النتيجة هي كائن File (Compressor قد يعيد Blob)
                    if (result instanceof Blob && !(result instanceof File)) {
                        const newFile = new File([result], file.name, {
                            type: result.type,
                            lastModified: Date.now(),
                        });
                        resolve(newFile);
                    } else {
                        resolve(result as File);
                    }
                },
                error(err: Error) {
                    console.error('❌ Image compression failed:', err.message);
                    setCompressionError(err.message);
                    setIsCompressing(false);
                    // في حالة الفشل، نرجع الملف الأصلي كإجراء احتياطي
                    resolve(file);
                },
                ...options,
            };

            new Compressor(file, defaultOptions);
        });
    }, []);

    /**
     * ضغط عدة صور دفعة واحدة
     * @param {File[] | FileList} files - مصفوفة من ملفات الصور
     * @param {Compressor.Options} options - خيارات الضغط
     * @returns {Promise<File[]>} - مصفوفة من الملفات المضغوطة
     */
    const compressImages = useCallback(async (files: File[] | FileList, options: Compressor.Options = {}): Promise<File[]> => {
        if (!files || files.length === 0) return [];

        setIsCompressing(true);
        setCompressionError(null);

        try {
            const compressedFiles = await Promise.all(
                Array.from(files).map(file => compressImage(file, options))
            );

            setIsCompressing(false);
            return compressedFiles;
        } catch (error: any) {
            console.error('❌ Batch image compression failed:', error);
            setCompressionError(error.message);
            setIsCompressing(false);

            // في حالة الفشل، إرجاع الملفات الأصلية
            return Array.from(files);
        }
    }, [compressImage]);

    /**
     * التحقق من صحة ملف الصورة
     * @param {File} file - ملف الصورة
     * @returns {{ isValid: boolean; errors: string[] }} - نتيجة التحقق
     */
    const validateImage = useCallback((file: File) => {
        const errors: string[] = [];
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
