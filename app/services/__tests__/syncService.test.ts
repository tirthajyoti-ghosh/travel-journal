/**
 * Sync Service Integration Tests
 * 
 * These tests use a mocked local storage but real GitHub API
 * to verify the sync logic works correctly.
 * 
 * Run with: npx jest services/__tests__/syncService.test.ts --runInBand
 */

// Define __DEV__ for Node.js test environment (React Native global)
// @ts-ignore - React Native global that exists at runtime
globalThis.__DEV__ = true;

import { Story, GitHubConfig } from '@/types';

// GitHub test configuration
// IMPORTANT: Set GITHUB_TEST_TOKEN environment variable before running tests
// e.g., GITHUB_TEST_TOKEN=github_pat_xxx npx jest services/__tests__/syncService.test.ts
const TEST_GITHUB_CONFIG: GitHubConfig = {
  token: process.env.GITHUB_TEST_TOKEN || '',
  owner: 'tirthajyoti-ghosh',
  repo: 'travel-journal-stories',
  branch: 'dev-playground',
};

// ============================================================
// MOCK LOCAL STORAGE
// ============================================================

let mockLocalStories: Story[] = [];
let mockGitHubConfig: GitHubConfig | null = TEST_GITHUB_CONFIG;

// Mock storageService
jest.mock('../storageService', () => ({
  getStories: jest.fn(() => Promise.resolve(mockLocalStories)),
  getStory: jest.fn((id: string) => Promise.resolve(mockLocalStories.find(s => s.id === id) || null)),
  saveStory: jest.fn((story: Partial<Story>) => {
    const now = new Date().toISOString();
    const existingIndex = mockLocalStories.findIndex(s => s.id === story.id);
    
    if (existingIndex >= 0) {
      const updatedStory: Story = {
        ...mockLocalStories[existingIndex],
        ...story,
        updatedAt: now,
      };
      mockLocalStories[existingIndex] = updatedStory;
      return Promise.resolve(updatedStory);
    } else {
      const newStory: Story = {
        id: story.id || Date.now().toString(),
        title: story.title || '',
        date: story.date || new Date().toISOString().split('T')[0],
        location: story.location || '',
        content: story.content || '',
        images: story.images || [],
        isDraft: story.isDraft !== undefined ? story.isDraft : true,
        createdAt: now,
        updatedAt: now,
        ...story,
      };
      mockLocalStories.push(newStory);
      return Promise.resolve(newStory);
    }
  }),
  saveStories: jest.fn((stories: Story[]) => {
    mockLocalStories = stories;
    return Promise.resolve();
  }),
  deleteStory: jest.fn((id: string) => {
    mockLocalStories = mockLocalStories.filter(s => s.id !== id);
    return Promise.resolve();
  }),
  clearAllStories: jest.fn(() => {
    mockLocalStories = [];
    return Promise.resolve();
  }),
  saveData: jest.fn(() => Promise.resolve()),
  getData: jest.fn((key: string) => {
    if (key === '@travel_journal:github_config') {
      return Promise.resolve(mockGitHubConfig ? JSON.stringify(mockGitHubConfig) : null);
    }
    return Promise.resolve(null);
  }),
}));

// Import after mocking
import * as syncService from '../syncService';
import * as githubService from '../githubService';
import * as storageService from '../storageService';

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Create a test story with unique ID
 */
function createTestStory(overrides: Partial<Story> = {}): Story {
  const now = new Date();
  const uniqueId = `test-${now.getTime()}-${Math.random().toString(36).substr(2, 9)}`;
  
  return {
    id: uniqueId,
    title: `Test Story ${uniqueId.slice(-6)}`,
    date: now.toISOString().split('T')[0],
    location: 'Test City',
    content: '<p>Test content for sync testing</p>',
    images: [],
    isDraft: true,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    ...overrides,
  };
}

/**
 * Delete a story from GitHub
 */
async function deleteFromGitHub(path: string): Promise<boolean> {
  try {
    // Get file SHA first
    const response = await fetch(
      `https://api.github.com/repos/${TEST_GITHUB_CONFIG.owner}/${TEST_GITHUB_CONFIG.repo}/contents/${path}?ref=${TEST_GITHUB_CONFIG.branch}`,
      {
        headers: {
          'Authorization': `Bearer ${TEST_GITHUB_CONFIG.token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      }
    );

    if (!response.ok) {
      if (response.status === 404) return true; // Already deleted
      return false;
    }

    const data = await response.json();
    
    // Delete the file
    const deleteResponse = await fetch(
      `https://api.github.com/repos/${TEST_GITHUB_CONFIG.owner}/${TEST_GITHUB_CONFIG.repo}/contents/${path}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${TEST_GITHUB_CONFIG.token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `[TEST] Delete ${path}`,
          sha: data.sha,
          branch: TEST_GITHUB_CONFIG.branch,
        }),
      }
    );

    return deleteResponse.ok;
  } catch (error) {
    console.error('Failed to delete from GitHub:', error);
    return false;
  }
}

/**
 * List all test files in GitHub stories folder
 */
async function listGitHubTestFiles(): Promise<string[]> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${TEST_GITHUB_CONFIG.owner}/${TEST_GITHUB_CONFIG.repo}/contents/stories?ref=${TEST_GITHUB_CONFIG.branch}`,
      {
        headers: {
          'Authorization': `Bearer ${TEST_GITHUB_CONFIG.token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      }
    );

    if (!response.ok) {
      if (response.status === 404) return [];
      throw new Error(`Failed to list files: ${response.status}`);
    }

    const files = await response.json();
    // Return test files (those starting with 'test-') AND old timestamp-based files
    // Old format: 17xxxxxxxxxx.html (epoch timestamps from date)
    return files
      .filter((f: any) => {
        const name = f.name;
        // Test files
        if (name.startsWith('test-') && name.endsWith('.html')) return true;
        // Old epoch-based filenames (13 digits starting with 17)
        if (/^17\d{11}\.html$/.test(name)) return true;
        // Local epoch-based filenames (13-digit timestamps)
        if (/^local-\d+\.html$/.test(name)) return true;
        // Parse test files
        if (name.startsWith('parse-test-')) return true;
        return false;
      })
      .map((f: any) => f.path);
  } catch (error) {
    console.error('Failed to list GitHub files:', error);
    return [];
  }
}

/**
 * Clean up all test files from GitHub
 */
async function cleanupTestFiles(): Promise<void> {
  const testFiles = await listGitHubTestFiles();
  for (const path of testFiles) {
    await deleteFromGitHub(path);
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

// ============================================================
// TEST SETUP/TEARDOWN
// ============================================================

// Skip all tests if no token is provided
const hasToken = !!TEST_GITHUB_CONFIG.token;
const describeWithToken = hasToken ? describe : describe.skip;

beforeAll(async () => {
  if (!hasToken) {
    console.warn('⚠️  GITHUB_TEST_TOKEN not set. Skipping integration tests.');
    console.warn('   Run with: GITHUB_TEST_TOKEN=your_token npx jest services/__tests__/syncService.test.ts');
    return;
  }
  // Clean up any leftover test files from previous runs
  console.log('Pre-test cleanup: removing old test files...');
  await cleanupTestFiles();
}, 120000);

beforeEach(() => {
  // Reset mock local storage before each test
  mockLocalStories = [];
  mockGitHubConfig = TEST_GITHUB_CONFIG;
  jest.clearAllMocks();
});

afterAll(async () => {
  // Clean up any test files created during tests
  console.log('Post-test cleanup: removing test files...');
  await cleanupTestFiles();
}, 120000);

// ============================================================
// TESTS
// ============================================================

describe('GitHub Connection', () => {
  it('should connect to GitHub with valid token', async () => {
    const isConnected = await githubService.testGitHubConnection(TEST_GITHUB_CONFIG);
    expect(isConnected).toBe(true);
  }, 10000);

  it('should detect GitHub is configured', async () => {
    const isConfigured = await githubService.isGitHubConfigured();
    expect(isConfigured).toBe(true);
  }, 10000);
});

describe('ID Generation Bug Investigation', () => {
  it('BUG #1: Stories on same date get same filename - SHOULD FAIL', async () => {
    // Create two stories on the same date
    const date = '2025-12-26';
    
    const story1 = createTestStory({
      id: 'unique-id-1',
      title: 'Story One',
      date: date,
    });
    
    const story2 = createTestStory({
      id: 'unique-id-2', 
      title: 'Story Two',
      date: date,
    });

    // Publish both stories
    const result1 = await githubService.publishStory(story1);
    console.log('Story 1 result:', result1);
    
    // Small delay to ensure we're not hitting rate limits
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const result2 = await githubService.publishStory(story2);
    console.log('Story 2 result:', result2);

    // EXPECTED: Two different files created
    // ACTUAL BUG: Same file is updated because filename is date-based
    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);
    expect(result1.path).not.toBe(result2.path); // THIS SHOULD PASS BUT WILL FAIL
    
    // Cleanup
    if (result1.path) await deleteFromGitHub(result1.path);
    if (result2.path && result2.path !== result1.path) await deleteFromGitHub(result2.path);
  }, 30000);

  it('BUG #2: ID mismatch - local ID vs GitHub extracted ID', async () => {
    // Create a story with a unique timestamp-based ID (like editor does)
    const creationTime = Date.now();
    const storyDate = '2025-12-20'; // Different from creation time
    
    const localStory: Story = {
      id: creationTime.toString(), // ID based on creation time
      title: 'Test ID Mismatch',
      date: storyDate, // Date field is different
      location: 'Test City',
      content: '<p>Testing ID mismatch</p>',
      images: [],
      isDraft: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Publish to GitHub
    const publishResult = await githubService.publishStory(localStory);
    console.log('Publish result:', publishResult);
    expect(publishResult.success).toBe(true);

    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Fetch stories from GitHub
    const githubStories = await githubService.fetchAllStories();
    
    // Find our story
    const fetchedStory = githubStories.find(s => s.title === 'Test ID Mismatch');
    console.log('Local story ID:', localStory.id);
    console.log('Fetched story ID:', fetchedStory?.id);
    console.log('Fetched story path:', fetchedStory?.githubPath);

    // EXPECTED: IDs should match
    // ACTUAL BUG: IDs might not match because ID is extracted from filename
    expect(fetchedStory).toBeDefined();
    expect(fetchedStory?.id).toBe(localStory.id); // THIS MIGHT FAIL

    // Cleanup
    if (publishResult.path) await deleteFromGitHub(publishResult.path);
  }, 30000);
});

describe('Sync Service - Core Logic', () => {
  it('should push new local story to GitHub', async () => {
    const story = createTestStory({
      title: 'New Local Story for Sync',
      isDraft: true,
    });
    
    mockLocalStories = [story];

    const result = await syncService.syncStories();
    
    console.log('Sync result:', result);
    
    expect(result.success).toBe(true);
    expect(result.pushedCount).toBe(1);
    expect(result.pulledCount).toBe(0);

    // Verify story was updated with githubPath
    const savedCall = (storageService.saveStory as jest.Mock).mock.calls;
    const lastSaveCall = savedCall[savedCall.length - 1];
    expect(lastSaveCall[0].githubPath).toBeDefined();

    // Cleanup
    if (lastSaveCall[0].githubPath) {
      await deleteFromGitHub(lastSaveCall[0].githubPath);
    }
  }, 30000);

  it('BUG #3: Duplicate stories during sync - simulating the bug scenario', async () => {
    // Simulate: User creates a story locally
    const localStory = createTestStory({
      id: `local-${Date.now()}`, // Unique local ID
      title: 'Duplicate Bug Test',
      date: '2025-12-25',
      isDraft: false,
    });

    mockLocalStories = [localStory];

    // First sync - should push to GitHub
    const result1 = await syncService.syncStories();
    console.log('First sync result:', result1);
    expect(result1.pushedCount).toBe(1);

    // Wait for GitHub to process
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Now fetch from GitHub to see what ID the story has there
    const githubStories = await githubService.fetchAllStories();
    const matchingGithubStory = githubStories.find(s => s.title === 'Duplicate Bug Test');
    
    console.log('Local ID:', localStory.id);
    console.log('GitHub ID:', matchingGithubStory?.id);
    console.log('GitHub Path:', matchingGithubStory?.githubPath);

    // Reset local storage to simulate fresh state
    mockLocalStories = [localStory];

    // Second sync - what happens?
    const result2 = await syncService.syncStories();
    console.log('Second sync result:', result2);
    console.log('Local stories after sync:', mockLocalStories.length);

    // EXPECTED: No duplicates, story IDs should be reconciled
    // ACTUAL BUG: If IDs don't match, we get both pushed AND pulled
    expect(result2.pushedCount + result2.pulledCount).toBeLessThanOrEqual(1);
    expect(mockLocalStories.length).toBe(1); // Should still be just 1 story

    // Cleanup
    if (matchingGithubStory?.githubPath) {
      await deleteFromGitHub(matchingGithubStory.githubPath);
    }
  }, 60000);
});

describe('Filename Generation Analysis', () => {
  it('should analyze how filenames are generated', async () => {
    const testCases = [
      { date: '2025-12-26', id: Date.now().toString() },
      { date: '2025-01-01', id: 'custom-id-123' },
      { date: new Date().toISOString().split('T')[0], id: `${Date.now()}-abc` },
    ];

    console.log('\n=== FILENAME GENERATION ANALYSIS ===\n');

    for (const tc of testCases) {
      const story = createTestStory({
        id: tc.id,
        date: tc.date,
        title: `Analysis Test ${tc.id.slice(-6)}`,
      });

      // The filename is generated based on story.date, not story.id
      const expectedFilename = `stories/${new Date(tc.date).getTime()}.html`;
      
      console.log(`Story ID: ${tc.id}`);
      console.log(`Story Date: ${tc.date}`);
      console.log(`Expected Filename: ${expectedFilename}`);
      console.log(`Expected ID after fetch: ${new Date(tc.date).getTime()}`);
      console.log(`ID Mismatch: ${tc.id !== new Date(tc.date).getTime().toString()}`);
      console.log('---');
    }

    // This test always passes - it's just for analysis
    expect(true).toBe(true);
  });

  it('should verify parseHtmlContent extracts ID from filename', async () => {
    // Create and publish a story
    const uniqueId = `parse-test-${Date.now()}`;
    const story = createTestStory({
      id: uniqueId,
      title: 'Parse Test Story',
      date: '2025-12-15',
    });

    const result = await githubService.publishStory(story);
    expect(result.success).toBe(true);
    
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Fetch all stories
    const stories = await githubService.fetchAllStories();
    const fetchedStory = stories.find(s => s.title === 'Parse Test Story');

    console.log('\n=== PARSE ANALYSIS ===');
    console.log('Original ID:', uniqueId);
    console.log('Fetched ID:', fetchedStory?.id);
    console.log('GitHub Path:', fetchedStory?.githubPath);
    console.log('IDs Match:', uniqueId === fetchedStory?.id);

    // The ID should NOT match because parseHtmlContent extracts it from filename
    // This is a BUG we need to fix
    
    // Cleanup
    if (result.path) await deleteFromGitHub(result.path);
  }, 30000);
});

describe('Proposed Fix Validation', () => {
  it('ID should be preserved in frontmatter and used during parse', async () => {
    // This test documents what SHOULD happen after the fix
    
    // When publishing, the story ID should be stored in frontmatter
    // When parsing, the ID should be read from frontmatter, not filename
    
    // For now, let's just verify the current behavior
    const story = createTestStory({
      id: 'my-unique-story-id',
      title: 'Frontmatter ID Test',
    });

    const result = await githubService.publishStory(story);
    console.log('Published path:', result.path);
    
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Check the actual content on GitHub
    if (result.path) {
      const response = await fetch(
        `https://api.github.com/repos/${TEST_GITHUB_CONFIG.owner}/${TEST_GITHUB_CONFIG.repo}/contents/${result.path}?ref=${TEST_GITHUB_CONFIG.branch}`,
        {
          headers: {
            'Authorization': `Bearer ${TEST_GITHUB_CONFIG.token}`,
            'Accept': 'application/vnd.github.v3+json',
          },
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        const content = atob(data.content);
        console.log('\n=== FRONTMATTER CONTENT ===');
        console.log(content.substring(0, 500));
        
        // Check if ID is in frontmatter
        const hasIdInFrontmatter = content.includes('id: "my-unique-story-id"') || 
                                    content.includes("id: 'my-unique-story-id'");
        console.log('ID in frontmatter:', hasIdInFrontmatter);
        
        // This is what we need to add!
        if (!hasIdInFrontmatter) {
          console.log('FIX NEEDED: Add ID to frontmatter in generateContent()');
        }
      }

      await deleteFromGitHub(result.path);
    }
    
    expect(result.success).toBe(true);
  }, 30000);
});

