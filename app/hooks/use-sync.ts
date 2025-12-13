import { useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as syncService from '@/services/syncService';
import { SyncStatus, SyncResult } from '@/services/syncService';

const LAST_SYNC_KEY = '@travel_journal:last_sync_time';

interface UseSyncResult {
  syncing: boolean;
  status: SyncStatus;
  lastSyncTime: Date | null;
  syncStats: {
    pushed: number;
    pulled: number;
    updated: number;
    errors: number;
  } | null;
  startSync: (force?: boolean) => Promise<SyncResult | null>;
  isStale: () => boolean;
}

/**
 * Hook for managing story synchronization between local and GitHub
 * Provides sync state, controls, and utilities
 */
export function useSync(): UseSyncResult {
  const [syncing, setSyncing] = useState(false);
  const [status, setStatus] = useState<SyncStatus>('idle');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncStats, setSyncStats] = useState<{
    pushed: number;
    pulled: number;
    updated: number;
    errors: number;
  } | null>(null);

  // Load last sync time from storage on mount
  useEffect(() => {
    const loadLastSyncTime = async () => {
      try {
        const stored = await AsyncStorage.getItem(LAST_SYNC_KEY);
        if (stored) {
          setLastSyncTime(new Date(stored));
        }
      } catch (error) {
        console.error('[Sync Hook] Failed to load last sync time:', error);
      }
    };

    loadLastSyncTime();
  }, []);

  /**
   * Check if sync is stale (more than 5 minutes since last sync)
   */
  const isStale = useCallback((): boolean => {
    return syncService.shouldSync(lastSyncTime, 5);
  }, [lastSyncTime]);

  /**
   * Start synchronization process
   * @param force - Force sync even if recently synced
   */
  const startSync = useCallback(async (force: boolean = false): Promise<SyncResult | null> => {
    // Don't sync if already syncing
    if (syncing) {
      console.log('[Sync Hook] Already syncing, skipping');
      return null;
    }

    // Check if sync is needed (unless forced)
    if (!force && !isStale()) {
      console.log('[Sync Hook] Recent sync exists, skipping');
      return null;
    }

    console.log('[Sync Hook] Starting sync...');
    setSyncing(true);
    setStatus('syncing');

    try {
      const result = await syncService.syncStories();

      // Update stats
      setSyncStats({
        pushed: result.pushedCount,
        pulled: result.pulledCount,
        updated: result.updatedCount,
        errors: result.errorCount,
      });

      // Update last sync time
      const now = new Date();
      setLastSyncTime(now);
      await AsyncStorage.setItem(LAST_SYNC_KEY, now.toISOString());

      // Update status
      setStatus(result.success ? 'success' : 'error');

      console.log('[Sync Hook] Sync completed:', {
        success: result.success,
        stats: {
          pushed: result.pushedCount,
          pulled: result.pulledCount,
          updated: result.updatedCount,
          errors: result.errorCount,
        },
      });

      // Reset status after a delay
      setTimeout(() => {
        setStatus('idle');
      }, 2000);

      return result;
    } catch (error) {
      console.error('[Sync Hook] Sync failed:', error);
      setStatus('error');
      
      // Reset status after delay
      setTimeout(() => {
        setStatus('idle');
      }, 3000);

      return null;
    } finally {
      setSyncing(false);
    }
  }, [syncing, isStale, lastSyncTime]);

  return {
    syncing,
    status,
    lastSyncTime,
    syncStats,
    startSync,
    isStale,
  };
}
