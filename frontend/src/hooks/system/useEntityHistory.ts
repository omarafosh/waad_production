import { useState, useEffect, useCallback } from 'react';
import auditService from 'services/api/audit.service';

export interface EntityHistoryOptions {
    entityType?: string;
    entityId?: string | number;
    correlationId?: string;
}

export interface EntityHistoryHook {
    data: any[];
    loading: boolean;
    error: string | null;
    hasMore: boolean;
    loadMore: () => void;
    refresh: () => void;
}

/**
 * Hook for Generic Entity History Audit
 * @param {EntityHistoryOptions} options - { entityType, entityId, correlationId }
 */
export const useEntityHistory = (options: EntityHistoryOptions = {}): EntityHistoryHook => {
    const { entityType, entityId, correlationId } = options;

    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState<number>(0);
    const [size] = useState<number>(20);
    const [hasMore, setHasMore] = useState<boolean>(true);

    const fetchHistory = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await auditService.getHistory({
                entityType,
                entityId,
                correlationId,
                page,
                size
            });

            // Extract data from ApiResponse/Page wrapper
            const pageData = response?.data || response;
            const content = pageData?.content || [];
            const totalPages = pageData?.totalPages || 0;

            if (page === 0) {
                setData(content);
            } else {
                setData((prev) => [...prev, ...content]);
            }

            setHasMore(page < totalPages - 1);
        } catch (err: any) {
            setError(err?.message || 'فشل تحميل سجل التدقيق');
            console.error('Error fetching entity history:', err);
        } finally {
            setLoading(false);
        }
    }, [entityType, entityId, correlationId, page, size]);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    const loadMore = () => {
        if (!loading && hasMore) {
            setPage((prev) => prev + 1);
        }
    };

    const refresh = () => {
        setPage(0);
        setData([]);
        setHasMore(true);
    };

    return {
        data,
        loading,
        error,
        hasMore,
        loadMore,
        refresh
    };
};
