import { useState, useEffect, useCallback } from 'react';
import { getStore, saveStore, AppData } from '../utils/store';

/**
 * useStore — eliminates the 3-line boilerplate in every feature component:
 *
 *   const [data, setData] = useState<AppData | null>(null);
 *   useEffect(() => { getStore().then(setData); }, []);
 *   if (!data) return <LoadingSkeleton />;
 *
 * Usage:
 *   const { data, loading, updateStore } = useStore();
 */
export function useStore() {
  const [data, setData] = useState<AppData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getStore().then(d => {
      if (!cancelled) {
        setData(d);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, []);

  /**
   * updateStore — persists an updated AppData snapshot and refreshes
   * local state atomically.  
   * Pass a callback that receives the current data and returns the next data.
   */
  const updateStore = useCallback(async (updater: (prev: AppData) => AppData) => {
    setData(prev => {
      if (!prev) return prev;
      const next = updater(prev);
      saveStore(next); // fire-and-forget; errors are caught inside saveStore
      return next;
    });
  }, []);

  /**
   * refreshStore — re-reads from storage (useful after cross-tab changes).
   */
  const refreshStore = useCallback(async () => {
    setLoading(true);
    const d = await getStore();
    setData(d);
    setLoading(false);
  }, []);

  return { data, loading, updateStore, refreshStore };
}
