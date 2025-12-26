import * as storageService from './storageService';
import { GitHubConfig, Story } from '@/types';

const GITHUB_CONFIG_KEY = '@travel_journal:github_config';

/**
 * GitHub Service for publishing stories to repository
 * 
 * Environment-based branch targeting:
 * - Development (__DEV__ = true): publishes to 'dev-playground' branch
 * - Production (__DEV__ = false): publishes to 'main' branch
 * 
 * Error Handling Strategy:
 * - 404 errors are handled gracefully (expected when files/directories don't exist)
 * - API errors are logged with proper context
 * - Individual failures don't cascade to break entire operations
 * - User-friendly error messages are returned for all failure cases
 */

export interface PublishResult {
  success: boolean;
  path?: string;
  url?: string;
  error?: string;
}

/**
 * Helper to handle GitHub API response errors consistently
 */
const handleApiError = async (
  response: Response,
  context: string
): Promise<string> => {
  try {
    const error = await response.json();
    const message = error.message || `${context} failed`;
    console.error(`[GitHub API] ${context}:`, error);
    return message;
  } catch (parseError) {
    console.error(`[GitHub API] ${context} (non-JSON):`, response.status, response.statusText);
    return `${context} failed: ${response.status} ${response.statusText}`;
  }
};

/**
 * Get the target branch based on environment
 */
export const getTargetBranch = (): string => {
  return __DEV__ ? 'dev-playground' : 'main';
};

/**
 * Save GitHub configuration securely
 */
export const saveGitHubConfig = async (config: GitHubConfig): Promise<void> => {
  await storageService.saveData(GITHUB_CONFIG_KEY, JSON.stringify(config));
};

/**
 * Load GitHub configuration
 */
export const loadGitHubConfig = async (): Promise<GitHubConfig | null> => {
  const data = await storageService.getData(GITHUB_CONFIG_KEY);
  if (!data) return null;
  
  try {
    return JSON.parse(data) as GitHubConfig;
  } catch (error) {
    console.error('Failed to parse GitHub config:', error);
    return null;
  }
};

/**
 * Check if GitHub is configured
 */
export const isGitHubConfigured = async (): Promise<boolean> => {
  const config = await loadGitHubConfig();
  return !!(config && config.token && config.owner && config.repo);
};

/**
 * Generate HTML filename from story
 * Format: <story-id>.html (e.g. 1732856959000-abc123.html)
 * Uses the unique story ID to prevent filename collisions
 * 
 * Previously used date-based timestamp which caused collisions
 * when multiple stories were created on the same date.
 */
const generateHtmlFilename = (story: Story): string => {
  // Use story ID directly for uniqueness
  // Sanitize the ID to be safe for filenames (replace unsafe chars with dashes)
  const safeId = story.id.replace(/[^a-zA-Z0-9-_]/g, '-');
  return `${safeId}.html`;
};



/**
 * Generate content with frontmatter
 * 
 * IMPORTANT: The 'id' field is stored in frontmatter to ensure
 * consistency between local and GitHub storage. This fixes the
 * bug where IDs were extracted from filenames, causing mismatches.
 */
const generateContent = (story: Story): string => {
  const frontmatter = `---
id: "${story.id}"
title: "${story.title}"
date: "${story.date}"
location: "${story.location}"
${story.coordinates ? `coordinates: [${story.coordinates[0]}, ${story.coordinates[1]}]` : ''}
createdAt: "${story.createdAt}"
updatedAt: "${story.updatedAt}"
${story.isDraft ? 'draft: true' : ''}
${story.archived ? `archived: true\narchivedAt: "${story.archivedAt || new Date().toISOString()}"` : ''}
${story.albumShareUrl ? `media:\n  - "${story.albumShareUrl}"` : ''}
---

`;

  // Store raw HTML content directly
  return frontmatter + story.content;
};

/**
 * Get existing file SHA (needed for updates)
 */
const getFileSha = async (
  config: GitHubConfig,
  path: string
): Promise<string | null> => {
  try {
    // Add timestamp to prevent caching
    const timestamp = new Date().getTime();
    const response = await fetch(
      `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${path}?ref=${config.branch}&t=${timestamp}`,
      {
        headers: {
          'Authorization': `Bearer ${config.token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      return data.sha;
    }
    
    // 404 is expected when file doesn't exist
    if (response.status === 404) {
      return null;
    }
    
    // Log unexpected errors
    console.warn('Unexpected error getting file SHA:', response.status, response.statusText);
    return null;
  } catch (error) {
    console.error('Error getting file SHA:', error);
    return null;
  }
};

/**
 * Publish story to GitHub
 * Automatically uses dev-playground branch in development, main in production
 */
export const publishStory = async (story: Story): Promise<PublishResult> => {
  try {
    const config = await loadGitHubConfig();
    
    if (!config) {
      return {
        success: false,
        error: 'GitHub not configured. Please set up your token and repository in Settings.',
      };
    }

    // Override branch based on environment
    const targetBranch = getTargetBranch();
    const activeConfig = { ...config, branch: targetBranch };

    // Determine if this is an update or new story
    const isUpdate = !!(story.githubPath && story.isPublished);
    
    // Use existing path for updates, generate new for first publish
    const path = isUpdate && story.githubPath ? story.githubPath : `stories/${generateHtmlFilename(story)}`;
    const content = generateContent(story);
    
    // Base64 encode content
    const encodedContent = btoa(unescape(encodeURIComponent(content)));
    
    // Get existing file SHA
    // We always check for SHA to handle:
    // 1. Explicit updates (isUpdate = true)
    // 2. Implicit updates (file exists but local state thinks it's new)
    // 3. Re-publishing to same path
    console.log('Checking for existing file. Path:', path, 'Branch:', activeConfig.branch);
    const existingSha = await getFileSha(activeConfig, path);
    console.log('Retrieved SHA:', existingSha);

    if (isUpdate && !existingSha) {
      return {
        success: false,
        error: 'Could not find existing file on GitHub. The file may have been deleted.',
      };
    }
    
    // Prepare commit message
    const commitMessage = (isUpdate || existingSha)
      ? `Update story: ${story.title}`
      : `Add story: ${story.title}`;

    console.log('Publishing to GitHub:', {
      path,
      branch: activeConfig.branch,
      isUpdate,
      hasSha: !!existingSha,
    });

    // Create or update file
    const response = await fetch(
      `https://api.github.com/repos/${activeConfig.owner}/${activeConfig.repo}/contents/${path}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${activeConfig.token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: commitMessage,
          content: encodedContent,
          branch: activeConfig.branch,
          ...(existingSha && { sha: existingSha }),
        }),
      }
    );

    if (!response.ok) {
      const errorMessage = await handleApiError(response, 'Publish story');
      return {
        success: false,
        error: errorMessage,
      };
    }

    let result;
    try {
      result = await response.json();
    } catch (parseError) {
      console.error('Failed to parse GitHub API response:', parseError);
      return {
        success: true,
        path: path,
        url: undefined,
      };
    }
    
    return {
      success: true,
      path: path,
      url: result.content?.html_url,
    };
  } catch (error) {
    console.error('Publish error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
};

/**
 * Test GitHub connection
 */
export const testGitHubConnection = async (config: GitHubConfig): Promise<boolean> => {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${config.owner}/${config.repo}`,
      {
        headers: {
          'Authorization': `Bearer ${config.token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      }
    );

    if (!response.ok) {
      // Log specific error for debugging
      if (response.status === 401) {
        console.warn('GitHub connection failed: Invalid token');
      } else if (response.status === 404) {
        console.warn('GitHub connection failed: Repository not found');
      } else {
        console.warn('GitHub connection failed:', response.status, response.statusText);
      }
    }

    return response.ok;
  } catch (error) {
    console.error('GitHub connection test failed:', error);
    return false;
  }
};

/**
 * Archive a published story on GitHub
 * Updates the frontmatter to set archived: true
 */
export const archiveStory = async (story: Story): Promise<PublishResult> => {
  try {
    const config = await loadGitHubConfig();
    
    if (!config) {
      return {
        success: false,
        error: 'GitHub not configured',
      };
    }

    if (!story.githubPath || !story.isPublished) {
      return {
        success: false,
        error: 'Story is not published or has no GitHub path',
      };
    }

    // Override branch based on environment
    const targetBranch = getTargetBranch();
    const activeConfig = { ...config, branch: targetBranch };

    // Get existing file SHA (required for updates)
    const existingSha = await getFileSha(activeConfig, story.githubPath);
    
    if (!existingSha) {
      return {
        success: false,
        error: 'Could not find existing file on GitHub',
      };
    }

    // Update story with archive metadata
    const archivedStory: Story = {
      ...story,
      archived: true,
      archivedAt: new Date().toISOString(),
    };

    // Generate updated content with archived frontmatter
    const content = generateContent(archivedStory);
    const encodedContent = btoa(unescape(encodeURIComponent(content)));

    // Update file on GitHub
    const response = await fetch(
      `https://api.github.com/repos/${activeConfig.owner}/${activeConfig.repo}/contents/${story.githubPath}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${activeConfig.token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `Archive story: ${story.title}`,
          content: encodedContent,
          branch: activeConfig.branch,
          sha: existingSha,
        }),
      }
    );

    if (!response.ok) {
      const errorMessage = await handleApiError(response, 'Archive story');
      return {
        success: false,
        error: errorMessage,
      };
    }

    let result;
    try {
      result = await response.json();
    } catch (parseError) {
      console.error('Failed to parse GitHub API response:', parseError);
      return {
        success: true,
        path: story.githubPath,
        url: undefined,
      };
    }

    return {
      success: true,
      path: story.githubPath,
      url: result.content?.html_url,
    };
  } catch (error) {
    console.error('Archive error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
};

/**
 * Unarchive a story on GitHub
 * Updates the frontmatter to remove archived status
 */
export const unarchiveStory = async (story: Story): Promise<PublishResult> => {
  try {
    const config = await loadGitHubConfig();
    
    if (!config) {
      return {
        success: false,
        error: 'GitHub not configured',
      };
    }

    if (!story.githubPath || !story.isPublished) {
      return {
        success: false,
        error: 'Story is not published or has no GitHub path',
      };
    }

    // Override branch based on environment
    const targetBranch = getTargetBranch();
    const activeConfig = { ...config, branch: targetBranch };

    // Get existing file SHA (required for updates)
    const existingSha = await getFileSha(activeConfig, story.githubPath);
    
    if (!existingSha) {
      return {
        success: false,
        error: 'Could not find existing file on GitHub',
      };
    }

    // Update story to remove archive metadata
    const unarchivedStory: Story = {
      ...story,
      archived: false,
      archivedAt: undefined,
    };

    // Generate updated content (will exclude archived fields)
    const content = generateContent(unarchivedStory);
    const encodedContent = btoa(unescape(encodeURIComponent(content)));

    // Update file on GitHub
    const response = await fetch(
      `https://api.github.com/repos/${activeConfig.owner}/${activeConfig.repo}/contents/${story.githubPath}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${activeConfig.token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `Unarchive story: ${story.title}`,
          content: encodedContent,
          branch: activeConfig.branch,
          sha: existingSha,
        }),
      }
    );

    if (!response.ok) {
      const errorMessage = await handleApiError(response, 'Unarchive story');
      return {
        success: false,
        error: errorMessage,
      };
    }

    let result;
    try {
      result = await response.json();
    } catch (parseError) {
      console.error('Failed to parse GitHub API response:', parseError);
      return {
        success: true,
        path: story.githubPath,
        url: undefined,
      };
    }

    return {
      success: true,
      path: story.githubPath,
      url: result.content?.html_url,
    };
  } catch (error) {
    console.error('Unarchive error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
};

/**
 * Fetch all stories from GitHub
 * Used for restoring cache
 */
export const fetchAllStories = async (): Promise<Story[]> => {
  try {
    const config = await loadGitHubConfig();
    if (!config) return [];

    const targetBranch = getTargetBranch();
    const activeConfig = { ...config, branch: targetBranch };

    // 1. List files in stories/ directory
    const response = await fetch(
      `https://api.github.com/repos/${activeConfig.owner}/${activeConfig.repo}/contents/stories?ref=${activeConfig.branch}`,
      {
        headers: {
          'Authorization': `Bearer ${activeConfig.token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      }
    );

    if (!response.ok) {
      // 404 is expected when stories directory doesn't exist yet
      if (response.status === 404) {
        console.log('Stories directory not found, returning empty list');
        return [];
      }
      
      // For other errors, log the details
      try {
        const errorData = await response.json();
        console.error('Failed to list stories:', errorData);
      } catch {
        console.error('Failed to list stories:', response.status, response.statusText);
      }
      return [];
    }

    const files = await response.json();
    if (!Array.isArray(files)) return [];

    const stories: Story[] = [];

    // 2. Fetch content for each file (HTML only)
    for (const file of files) {
      if (file.name.endsWith('.html')) {
        try {
          const contentResponse = await fetch(file.download_url);
          if (contentResponse.ok) {
            const content = await contentResponse.text();
            const story = parseHtmlContent(content, file.path);
            if (story) {
              stories.push(story);
            }
          } else {
            console.warn(`Failed to fetch story content: ${file.name}`, contentResponse.status);
          }
        } catch (fileError) {
          console.warn(`Error fetching story file ${file.name}:`, fileError);
          // Continue with other files
        }
      }
    }

    return stories;
  } catch (error) {
    console.error('Error fetching stories:', error);
    return [];
  }
};



/**
 * Parse HTML content with frontmatter into Story object
 * 
 * IMPORTANT: The 'id' field is now read from frontmatter (if available)
 * rather than being extracted from the filename. This ensures consistency
 * between local and GitHub storage and fixes duplicate story bugs.
 */
const parseHtmlContent = (content: string, path: string): Story | null => {
  try {
    const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
    const match = content.match(frontmatterRegex);
    
    if (!match) {
      console.warn(`Invalid format in ${path}: Missing frontmatter`);
      return null;
    }
    
    const [, frontmatter, htmlBody] = match;
    const metadata: Record<string, string> = {};
    
    frontmatter.split('\n').forEach(line => {
      const parts = line.split(':');
      if (parts.length >= 2) {
        const key = parts[0].trim();
        let value = parts.slice(1).join(':').trim();
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        }
        metadata[key] = value;
      }
    });

    // CRITICAL FIX: Use ID from frontmatter if available, otherwise fall back to filename
    // This ensures that the same story ID is used locally and on GitHub
    const filenameId = path.replace('stories/', '').replace('.html', '');
    const storyId = metadata.id || filenameId;

    // Body is already HTML - use directly
    return {
      id: storyId,
      title: metadata.title || 'Untitled',
      date: metadata.date || new Date().toISOString(),
      location: metadata.location || '',
      content: htmlBody,
      images: [], 
      albumShareUrl: metadata.media ? metadata.media.replace('- ', '').trim() : undefined,
      isDraft: metadata.draft === 'true',
      isPublished: metadata.draft !== 'true',
      publishedAt: metadata.date,
      createdAt: metadata.createdAt || new Date().toISOString(),
      updatedAt: metadata.updatedAt || new Date().toISOString(),
      githubPath: path,
      archived: metadata.archived === 'true',
      archivedAt: metadata.archivedAt,
    };
  } catch (error) {
    console.error('Error parsing HTML content:', error);
    return null;
  }
};

/**
 * Save draft to GitHub
 * Similar to publishStory but marks as draft
 */
export const saveDraft = async (story: Story): Promise<PublishResult> => {
  try {
    const config = await loadGitHubConfig();
    
    if (!config) {
      return {
        success: false,
        error: 'GitHub not configured. Please set up your token and repository in Settings.',
      };
    }

    // Override branch based on environment
    const targetBranch = getTargetBranch();
    const activeConfig = { ...config, branch: targetBranch };

    // Determine if this is an update or new story
    // For drafts, we check if we have a githubPath already
    const isUpdate = !!(story.githubPath);
    
    // Use existing path for updates, generate new for first save
    const path = isUpdate && story.githubPath ? story.githubPath : `stories/${generateHtmlFilename(story)}`;
    
    // Ensure story is marked as draft for content generation
    const draftStory = { ...story, isDraft: true };
    const content = generateContent(draftStory);
    
    // Base64 encode content
    const encodedContent = btoa(unescape(encodeURIComponent(content)));
    
    // Get existing file SHA
    console.log('Checking for existing file (draft). Path:', path, 'Branch:', activeConfig.branch);
    const existingSha = await getFileSha(activeConfig, path);
    console.log('Retrieved SHA:', existingSha);

    if (isUpdate && !existingSha) {
      // If we thought we were updating but file is gone, we'll just create it again (warn in logs)
      console.warn('Expected to update existing draft but file not found on GitHub. Creating new.');
    }
    
    // Prepare commit message
    const commitMessage = (isUpdate || existingSha)
      ? `Update draft: ${story.title}`
      : `Save draft: ${story.title}`;

    console.log('Saving draft to GitHub:', {
      path,
      branch: activeConfig.branch,
      isUpdate,
      hasSha: !!existingSha,
    });

    // Create or update file
    const response = await fetch(
      `https://api.github.com/repos/${activeConfig.owner}/${activeConfig.repo}/contents/${path}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${activeConfig.token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: commitMessage,
          content: encodedContent,
          branch: activeConfig.branch,
          ...(existingSha && { sha: existingSha }),
        }),
      }
    );

    if (!response.ok) {
      const errorMessage = await handleApiError(response, 'Save draft');
      return {
        success: false,
        error: errorMessage,
      };
    }

    let result;
    try {
      result = await response.json();
    } catch (parseError) {
      console.error('Failed to parse GitHub API response:', parseError);
      // Even if parsing fails, the request succeeded (response.ok was true)
      return {
        success: true,
        path: path,
        url: undefined,
      };
    }
    
    return {
      success: true,
      path: path,
      url: result.content?.html_url,
    };
  } catch (error) {
    console.error('Save draft error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
};

