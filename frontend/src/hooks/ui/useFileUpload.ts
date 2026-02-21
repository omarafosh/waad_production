import { useState, useCallback } from 'react';

export interface FileUploadOptions<TResult = any> {
  uploadFn?: (file: File, ...args: any[]) => Promise<TResult>;
  onSuccess?: (result: TResult) => void;
  onError?: (error: any) => void;
}

export interface FileUploadResult<TResult = any> {
  upload: (file: File, ...args: any[]) => Promise<TResult>;
  uploading: boolean;
  progress: number;
  error: string | null;
  uploadedFile: TResult | null;
  reset: () => void;
}

/**
 * useFileUpload Hook
 * 
 * Custom hook for handling file uploads with progress tracking
 * 
 * @param {Object} options - Configuration options
 * @param {Function} options.uploadFn - Upload function to use
 * @param {Function} options.onSuccess - Success callback
 * @param {Function} options.onError - Error callback
 * @returns {Object} Upload state and methods
 */
export const useFileUpload = <TResult = any>({ uploadFn, onSuccess, onError }: FileUploadOptions<TResult> = {}): FileUploadResult<TResult> => {
  const [uploading, setUploading] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<TResult | null>(null);

  const upload = useCallback(
    async (file: File, ...args: any[]): Promise<TResult> => {
      setUploading(true);
      setProgress(0);
      setError(null);
      setUploadedFile(null);

      try {
        // Progress callback
        const onProgress = (percent: number) => {
          setProgress(percent);
        };

        // Call the upload function with progress callback
        if (!uploadFn) {
          throw new Error('uploadFn is required');
        }
        const result = await uploadFn(file, ...args, onProgress);

        setUploadedFile(result);
        setProgress(100);

        if (onSuccess) {
          onSuccess(result);
        }

        return result;
      } catch (err: any) {
        const errorMessage = err.response?.data?.message || err.message || 'Upload failed';
        setError(errorMessage);

        if (onError) {
          onError(err);
        }

        throw err;
      } finally {
        setUploading(false);
      }
    },
    [uploadFn, onSuccess, onError]
  );

  const reset = useCallback(() => {
    setUploading(false);
    setProgress(0);
    setError(null);
    setUploadedFile(null);
  }, []);

  return {
    upload,
    uploading,
    progress,
    error,
    uploadedFile,
    reset,
  };
};

export interface MultiFileUploadOptions<TResult = any> {
  uploadFn?: (file: File, ...args: any[]) => Promise<TResult>;
  onSuccess?: (result: TResult, index: number) => void;
  onError?: (error: any, index: number) => void;
}

export interface UploadState<TResult = any> {
  file: File;
  progress: number;
  error: string | null;
  result: TResult | null;
  completed: boolean;
}

export interface MultiFileUploadResult<TResult = any> {
  uploadFiles: (files: FileList | File[], ...args: any[]) => Promise<TResult[]>;
  uploads: UploadState<TResult>[];
  uploading: boolean;
  reset: () => void;
}

/**
 * useMultiFileUpload Hook
 * 
 * Custom hook for handling multiple file uploads
 */
export const useMultiFileUpload = <TResult = any>({ uploadFn, onSuccess, onError }: MultiFileUploadOptions<TResult> = {}): MultiFileUploadResult<TResult> => {
  const [uploads, setUploads] = useState<UploadState<TResult>[]>([]);
  const [uploading, setUploading] = useState<boolean>(false);

  const uploadFiles = useCallback(
    async (files: FileList | File[], ...args: any[]): Promise<TResult[]> => {
      setUploading(true);
      const fileArray = Array.from(files);

      const uploadPromises = fileArray.map(async (file, index) => {
        const uploadState: UploadState<TResult> = {
          file,
          progress: 0,
          error: null,
          result: null,
          completed: false,
        };

        setUploads((prev) => {
          const newUploads = [...prev];
          newUploads[index] = uploadState;
          return newUploads;
        });

        try {
          const onProgress = (percent: number) => {
            setUploads((prev) => {
              const newUploads = [...prev];
              newUploads[index] = { ...newUploads[index], progress: percent };
              return newUploads;
            });
          };

          if (!uploadFn) {
            throw new Error('uploadFn is required');
          }
          const result = await uploadFn(file, ...args, onProgress);

          setUploads((prev) => {
            const newUploads = [...prev];
            newUploads[index] = {
              ...newUploads[index],
              result,
              completed: true,
              progress: 100,
            };
            return newUploads;
          });

          if (onSuccess) {
            onSuccess(result, index);
          }

          return result;
        } catch (err: any) {
          const errorMessage = err.response?.data?.message || err.message || 'Upload failed';

          setUploads((prev) => {
            const newUploads = [...prev];
            newUploads[index] = {
              ...newUploads[index],
              error: errorMessage,
              completed: true,
            };
            return newUploads;
          });

          if (onError) {
            onError(err, index);
          }

          throw err;
        }
      });

      try {
        const results = await Promise.all(uploadPromises);
        return results;
      } finally {
        setUploading(false);
      }
    },
    [uploadFn, onSuccess, onError]
  );

  const reset = useCallback(() => {
    setUploads([]);
    setUploading(false);
  }, []);

  return {
    uploadFiles,
    uploads,
    uploading,
    reset,
  };
};

export default useFileUpload;
