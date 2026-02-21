import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import axios from 'utils/axios';

export interface ImportCounts {
    created: number;
    updated: number;
    skipped: number;
    error: number;
}
// ... rest of types ...

export interface ActiveImport {
    batchId: string | number;
    fileName: string;
    status: string;
    progress: number;
    counts: ImportCounts;
    total: number;
    statusUrl: string;
    processedRows?: number;
    errorMessage?: string | null;
}

export interface ImportError {
    rowNumber: number;
    errorType: string;
    messageAr?: string;
    message?: string;
}

export interface ErrorDetails {
    batchId: string | number;
    errors: ImportError[];
}

export interface ImportProgressContextType {
    startImport: (batchId: string | number, fileName: string, statusUrl?: string | null) => void;
    activeImport: ActiveImport | null;
    isMinimized: boolean;
    setIsMinimized: (minimized: boolean) => void;
    dismissImport: () => void;
    viewErrors: (batchId: string | number) => Promise<void>;
    isErrorModalOpen: boolean;
    setIsErrorModalOpen: (open: boolean) => void;
    errorDetails: ErrorDetails | null;
}

const ImportProgressContext = createContext<ImportProgressContextType | null>(null);

export const useImportProgress = (): ImportProgressContextType => {
    const context = useContext(ImportProgressContext);
    if (!context) {
        throw new Error('useImportProgress must be used within a GlobalImportProgressProvider');
    }
    return context;
};

export interface GlobalImportProgressProviderProps {
    children: ReactNode;
}

export const GlobalImportProgressProvider: React.FC<GlobalImportProgressProviderProps> = ({ children }) => {
    const [activeImport, setActiveImport] = useState<ActiveImport | null>(null); // { batchId, fileName, status, progress, statusUrl }
    const [isMinimized, setIsMinimized] = useState(false);
    const [importHistory, setImportHistory] = useState<ActiveImport[]>([]);
    const [errorDetails, setErrorDetails] = useState<ErrorDetails | null>(null); // { batchId, errors: [] }
    const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);

    const POLLING_INTERVAL = 2000;

    const startImport = useCallback((batchId: string | number, fileName: string, statusUrl: string | null = null) => {
        setActiveImport({
            batchId,
            fileName,
            status: 'PROCESSING',
            progress: 0,
            counts: { created: 0, updated: 0, skipped: 0, error: 0 },
            total: 0,
            statusUrl: statusUrl || `unified-members/import/status/${batchId}`
        });
        setIsMinimized(false);
    }, []);

    const checkStatus = useCallback(async () => {
        if (!activeImport || activeImport.status === 'COMPLETED' || activeImport.status === 'FAILED') return;

        try {
            // Use the provided statusUrl or fallback to members import status
            const url = activeImport.statusUrl;
            console.log(`[ImportProgress] Polling status from: ${url}`);
            const response = await axios.get(url);
            const log = response.data?.data; // ApiResponse.data contains the MemberImportLog or PricingImportLog

            if (log) {
                const total = log.totalRows || 0;
                const processed = (log.createdCount || 0) + (log.updatedCount || 0) + (log.skippedCount || 0) + (log.errorCount || 0);
                let progress = total > 0 ? (processed / total) * 100 : 0;

                // STATUS HIERARCHY (To prevent backward jumps)
                const statusOrder: Record<string, number> = { 'PENDING': 0, 'VALIDATING': 1, 'VALIDATION': 1, 'PROCESSING': 2, 'COMPLETED': 3, 'FAILED': 3, 'PARTIAL': 3 };
                const currentStatus = activeImport.status?.toUpperCase() || 'PENDING';
                const receivedStatus = log.status?.toUpperCase() || 'PENDING';

                const currentRank = statusOrder[currentStatus] || 0;
                const receivedRank = statusOrder[receivedStatus] || 0;

                // PREVENT PROGRESS REGRESSION
                if (progress < activeImport.progress && receivedRank <= currentRank) {
                    progress = activeImport.progress;
                }

                // PREVENT STATUS REGRESSION (e.g. going from PROCESSING back to VALIDATING)
                let finalStatus = receivedStatus;
                if (receivedRank < currentRank) {
                    finalStatus = currentStatus; // Stay in higher status
                }

                const updatedState = {
                    ...activeImport,
                    status: finalStatus,
                    progress: progress,
                    processedRows: processed, // NEW: for detailed display
                    counts: {
                        created: log.createdCount || 0,
                        updated: log.updatedCount || 0,
                        skipped: log.skippedCount || 0,
                        error: log.errorCount || 0
                    },
                    total: total,
                    errorMessage: log.errorMessage || (finalStatus === 'FAILED' ? "فشل الاستيراد: الرجاء التأكد من صحة الملف وصلاحياتك." : null)
                };

                setActiveImport(updatedState);

                // UX: Auto-minimize after completion to move to background
                if (finalStatus === 'COMPLETED' && !isMinimized) {
                    setTimeout(() => {
                        setIsMinimized(true);
                    }, 3000); // Wait 3 seconds before minimizing
                }
            }
        } catch (error) {
            console.error("Failed to poll import status", error);
        }
    }, [activeImport, isMinimized]);

    useEffect(() => {
        let intervalId: any;
        const terminalStatuses = ['COMPLETED', 'FAILED', 'PARTIAL'];
        if (activeImport && !terminalStatuses.includes(activeImport.status)) {
            intervalId = setInterval(checkStatus, POLLING_INTERVAL);
        }
        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [activeImport, checkStatus]);

    const dismissImport = useCallback(() => {
        if (activeImport?.status === 'COMPLETED' || activeImport?.status === 'FAILED' || activeImport?.status === 'PARTIAL') {
            setImportHistory(prev => [activeImport, ...prev]);
            setActiveImport(null);
        } else {
            setIsMinimized(true);
        }
    }, [activeImport]);

    const viewErrors = useCallback(async (batchId: string | number) => {
        try {
            const response = await axios.get(`unified-members/import/errors/${batchId}`);
            const errors = response.data?.data || response.data?.result || [];
            setErrorDetails({ batchId, errors });
            setIsErrorModalOpen(true);
        } catch (err) {
            console.error("Failed to fetch import errors", err);
        }
    }, []);

    const contextValue = useMemo(() => ({
        startImport,
        activeImport,
        isMinimized,
        setIsMinimized,
        dismissImport,
        viewErrors,
        isErrorModalOpen,
        setIsErrorModalOpen,
        errorDetails
    }), [
        startImport,
        activeImport,
        isMinimized,
        setIsMinimized,
        dismissImport,
        viewErrors,
        isErrorModalOpen,
        setIsErrorModalOpen,
        errorDetails
    ]);

    return (
        <ImportProgressContext.Provider value={contextValue}>
            {children}
        </ImportProgressContext.Provider>
    );
};

export default ImportProgressContext;
