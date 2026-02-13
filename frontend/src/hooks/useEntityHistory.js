import { useState, useEffect, useCallback } from 'react';
import auditService from 'services/api/audit.service';

/**
 * Hook for Generic Entity History Audit
 * @param {Object} options - { entityType, entityId, correlationId }
 */
export const useEntityHistory = (options = {}) => {
    const { entityType, entityId, correlationId } = options;

    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(0);
    const [size] = useState(20);
    const [hasMore, setHasMore] = useState(true);

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
        } catch (err) {
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
