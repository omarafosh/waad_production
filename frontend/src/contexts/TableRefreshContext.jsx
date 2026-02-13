/**
 * TableRefreshContext - Global Table Refresh Mechanism
 * Phase D2.3 - Post-Create/Edit Refresh Contract
 *
 * ⚠️ CONTRACT:
 * - refreshKey is a number that increments on each triggerRefresh()
 * - TbaDataTable listens to refreshKey and fetches exactly ONCE when it changes
 * - Use triggerRefresh() after successful Create/Edit/Delete operations
 *
 * Usage:
 * 1. Wrap your list page with <TableRefreshProvider>
 * 2. Pass refreshKey to <TbaDataTable refreshKey={refreshKey} />
 * 3. Call triggerRefresh() from Create/Edit pages on success
 *
 * Example:
 * ```jsx
 * // In List page:
 * const { refreshKey } = useTableRefresh();
 * <TbaDataTable refreshKey={refreshKey} ... />
 *
 * // In Create page:
 * const { triggerRefresh } = useTableRefresh();
 * await createItem(data);
 * triggerRefresh();
 * navigate('/items');
 * ```
 */

import { createContext, useContext, useState, useMemo, useCallback, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import PropTypes from 'prop-types';

// ============================================================================
// CONTEXT
// ============================================================================

const TableRefreshContext = createContext(null);

// ============================================================================
// PROVIDER (for wrapping components manually)
// ============================================================================

/**
 * TableRefreshProvider - Wrap around routes that need table refresh coordination
 */
export const TableRefreshProvider = ({ children }) => {
  const [refreshKey, setRefreshKey] = useState(0);

  // Cross-tab synchronization
  useEffect(() => {
    const channel = new BroadcastChannel('tba-refresh-channel');
    channel.onmessage = (event) => {
      console.debug('[TableRefresh] 📥 Received broadcast:', event.data);
      if (event.data?.type === 'REFRESH_TABLE') {
        setRefreshKey((prev) => prev + 1);
      }
    };
    return () => channel.close();
  }, []);

  /**
   * Trigger a table refresh by incrementing the key
   * Broadcasts to other tabs to ensure synchronization
   */
  const triggerRefresh = useCallback(() => {
    console.debug('[TableRefresh] 🔄 Local Refresh Triggered');
    setRefreshKey((prev) => prev + 1);

    // Broadcast to other tabs
    try {
      const channel = new BroadcastChannel('tba-refresh-channel');
      channel.postMessage({ type: 'REFRESH_TABLE', timestamp: Date.now() });
      // Small delay to ensure message is dispatched before closing
      setTimeout(() => channel.close(), 100);
      console.debug('[TableRefresh] 📡 Broadcast sent: REFRESH_TABLE');
    } catch (e) {
      console.warn('[TableRefresh] Failed to broadcast refresh', e);
    }
  }, []);

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo(
    () => ({
      refreshKey,
      triggerRefresh
    }),
    [refreshKey, triggerRefresh]
  );

  return <TableRefreshContext.Provider value={value}>{children}</TableRefreshContext.Provider>;
};

TableRefreshProvider.propTypes = {
  children: PropTypes.node.isRequired
};

// ============================================================================
// ROUTE WRAPPER (for use in react-router element prop)
// ============================================================================

/**
 * TableRefreshLayout - Route layout that provides refresh context with Outlet
 * ⚠️ FIXED: Now uses the global context if available instead of shadowing it.
 */
export const TableRefreshLayout = () => {
  const context = useContext(TableRefreshContext);

  // If we're already inside a provider (e.g., AppProviders), just render children
  if (context) {
    return <Outlet />;
  }

  // Fallback: Provide a local context if used outside global providers
  return <TableRefreshProvider><Outlet /></TableRefreshProvider>;
};

// ============================================================================
// HOOK
// ============================================================================

/**
 * useTableRefresh - Access the table refresh context
 * @returns {{ refreshKey: number, triggerRefresh: () => void }}
 */
export const useTableRefresh = () => {
  const context = useContext(TableRefreshContext);

  // Return default values if used outside provider (graceful degradation)
  if (!context) {
    console.warn('[useTableRefresh] Used outside TableRefreshProvider - returning defaults');
    return {
      refreshKey: 0,
      triggerRefresh: () => {
        console.warn('[useTableRefresh] triggerRefresh called outside provider');
      }
    };
  }

  return context;
};

export default TableRefreshContext;
