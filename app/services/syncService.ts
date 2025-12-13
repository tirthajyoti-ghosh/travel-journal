import * as storageService from './storageService';
import * as githubService from './githubService';
import { Story } from '@/types';

export interface SyncResult {
  success: boolean;
  pushedCount: number;
  pulledCount: number;
  updatedCount: number;
  skippedCount: number;
  errorCount: number;
  errors: Array<{ storyId: string; error: string }>;
}

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

/**
 * Compare two timestamps and determine which is newer
 */
const isNewer = (timestamp1: string, timestamp2: string): boolean => {
  const time1 = new Date(timestamp1).getTime();
  const time2 = new Date(timestamp2).getTime();
  return time1 > time2;
};

/**
 * Push a story to GitHub
 */
const pushToGitHub = async (story: Story): Promise<{ success: boolean; error?: string; path?: string }> => {
  try {
    let result;
    
    if (story.isDraft) {
      result = await githubService.saveDraft(story);
    } else {
      result = await githubService.publishStory(story);
    }
    
    if (result.success && result.path) {
      // Update local story with GitHub path
      await storageService.saveStory({
        ...story,
        githubPath: result.path,
      });
    }
    
    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Pull a story from GitHub to local storage
 */
const pullToLocal = async (story: Story): Promise<{ success: boolean; error?: string }> => {
  try {
    await storageService.saveStory(story);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Sync all stories between local storage and GitHub
 * Compares timestamps and syncs bidirectionally
 */
export const syncStories = async (): Promise<SyncResult> => {
  const result: SyncResult = {
    success: true,
    pushedCount: 0,
    pulledCount: 0,
    updatedCount: 0,
    skippedCount: 0,
    errorCount: 0,
    errors: [],
  };

  try {
    // Check if GitHub is configured
    const isConfigured = await githubService.isGitHubConfigured();
    if (!isConfigured) {
      console.log('[Sync] GitHub not configured, skipping sync');
      return result;
    }

    // Fetch from both sources
    const [localStories, githubStories] = await Promise.all([
      storageService.getStories(),
      githubService.fetchAllStories(),
    ]);

    console.log(`[Sync] Starting sync: ${localStories.length} local, ${githubStories.length} from GitHub`);

    // Build maps for efficient lookup
    const localMap = new Map<string, Story>();
    const githubMap = new Map<string, Story>();

    localStories.forEach(story => localMap.set(story.id, story));
    githubStories.forEach(story => githubMap.set(story.id, story));

    // Get all unique story IDs
    const allIds = new Set([...localMap.keys(), ...githubMap.keys()]);

    // Process each story
    for (const id of allIds) {
      const localStory = localMap.get(id);
      const githubStory = githubMap.get(id);

      try {
        // Case 1: Only exists locally - push to GitHub
        if (localStory && !githubStory) {
          console.log(`[Sync] Pushing new story to GitHub: ${localStory.title}`);
          const pushResult = await pushToGitHub(localStory);
          
          if (pushResult.success) {
            result.pushedCount++;
          } else {
            result.errorCount++;
            result.errors.push({ storyId: id, error: pushResult.error || 'Push failed' });
          }
        }
        // Case 2: Only exists on GitHub - pull to local
        else if (!localStory && githubStory) {
          console.log(`[Sync] Pulling new story from GitHub: ${githubStory.title}`);
          const pullResult = await pullToLocal(githubStory);
          
          if (pullResult.success) {
            result.pulledCount++;
          } else {
            result.errorCount++;
            result.errors.push({ storyId: id, error: pullResult.error || 'Pull failed' });
          }
        }
        // Case 3: Exists in both - check timestamps
        else if (localStory && githubStory) {
          const localUpdated = localStory.updatedAt;
          const githubUpdated = githubStory.updatedAt;

          // Skip if timestamps are the same (already in sync)
          if (localUpdated === githubUpdated) {
            result.skippedCount++;
            continue;
          }

          // Determine which is newer
          if (isNewer(localUpdated, githubUpdated)) {
            // Local is newer - push to GitHub
            console.log(`[Sync] Local version newer, pushing: ${localStory.title}`);
            const pushResult = await pushToGitHub(localStory);
            
            if (pushResult.success) {
              result.updatedCount++;
            } else {
              result.errorCount++;
              result.errors.push({ storyId: id, error: pushResult.error || 'Update push failed' });
            }
          } else {
            // GitHub is newer - pull to local
            console.log(`[Sync] GitHub version newer, pulling: ${githubStory.title}`);
            const pullResult = await pullToLocal(githubStory);
            
            if (pullResult.success) {
              result.updatedCount++;
            } else {
              result.errorCount++;
              result.errors.push({ storyId: id, error: pullResult.error || 'Update pull failed' });
            }
          }
        }
      } catch (error) {
        console.error(`[Sync] Error processing story ${id}:`, error);
        result.errorCount++;
        result.errors.push({
          storyId: id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    console.log('[Sync] Sync completed:', {
      pushed: result.pushedCount,
      pulled: result.pulledCount,
      updated: result.updatedCount,
      skipped: result.skippedCount,
      errors: result.errorCount,
    });

    result.success = result.errorCount === 0;
    return result;
  } catch (error) {
    console.error('[Sync] Fatal sync error:', error);
    result.success = false;
    result.errorCount++;
    result.errors.push({
      storyId: 'SYNC',
      error: error instanceof Error ? error.message : 'Sync failed',
    });
    return result;
  }
};

/**
 * Check if enough time has passed since last sync to warrant a new sync
 */
export const shouldSync = (lastSyncTime: Date | null, minimumIntervalMinutes: number = 5): boolean => {
  if (!lastSyncTime) return true;
  
  const now = new Date();
  const diffMinutes = (now.getTime() - lastSyncTime.getTime()) / (1000 * 60);
  return diffMinutes >= minimumIntervalMinutes;
};
