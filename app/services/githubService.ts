import * as storageService from './storageService';
import { GitHubConfig, Story } from '@/types';

const GITHUB_CONFIG_KEY = '@travel_journal:github_config';

/**
 * GitHub Service for publishing stories to repository
 * 
 * Environment-based branch targeting:
 * - Development (__DEV__ = true): publishes to 'dev-playground' branch
 * - Production (__DEV__ = false): publishes to 'main' branch
 */

export interface PublishResult {
  success: boolean;
  path?: string;
  url?: string;
  error?: string;
}

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
 * Generate markdown filename from story
 * Format: <epoch-timestamp>.md (e.g. 1732856959000.md)
 * Uses UTC epoch time to be timezone independent
 */
const generateFilename = (story: Story): string => {
  const timestamp = new Date(story.date).getTime();
  return `${timestamp}.md`;
};

/**
 * Convert HTML content to markdown
 * Preserves spacing by converting empty <p> tags to blank lines
 */
const htmlToMarkdown = (html: string): string => {
  let markdown = html
    // Convert empty paragraphs to double newlines (blank lines in markdown)
    .replace(/<p><\/p>/g, '\n\n')
    .replace(/<p>\s*<\/p>/g, '\n\n')
    // Convert headings
    .replace(/<h1>(.*?)<\/h1>/g, '# $1\n\n')
    .replace(/<h2>(.*?)<\/h2>/g, '## $1\n\n')
    .replace(/<h3>(.*?)<\/h3>/g, '### $1\n\n')
    // Convert bold and italic
    .replace(/<strong>(.*?)<\/strong>/g, '**$1**')
    .replace(/<b>(.*?)<\/b>/g, '**$1**')
    .replace(/<em>(.*?)<\/em>/g, '*$1*')
    .replace(/<i>(.*?)<\/i>/g, '*$1*')
    // Convert line breaks
    .replace(/<br\s*\/?>/g, '\n')
    // Convert blockquotes
    .replace(/<blockquote>(.*?)<\/blockquote>/gs, (match, content) => {
      const lines = content.trim().split('\n');
      return lines.map((line: string) => '> ' + line).join('\n') + '\n\n';
    })
    // Convert lists
    .replace(/<ul>(.*?)<\/ul>/gs, '$1\n')
    .replace(/<ol>(.*?)<\/ol>/gs, '$1\n')
    .replace(/<li>(.*?)<\/li>/g, '- $1\n')
    // Convert regular paragraphs (do this after other conversions)
    .replace(/<p>(.*?)<\/p>/gs, '$1\n\n')
    // Remove any remaining HTML tags
    .replace(/<[^>]+>/g, '')
    // Decode HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    // Clean up excessive newlines but preserve intentional spacing
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
  
  return markdown;
};

/**
 * Generate markdown content with frontmatter
 */
const generateMarkdown = (story: Story): string => {
  const frontmatter = `---
title: "${story.title}"
date: "${story.date}"
location: "${story.location}"
${story.archived ? `archived: true\narchivedAt: "${story.archivedAt || new Date().toISOString()}"` : ''}
${story.albumShareUrl ? `media:\n  - "${story.albumShareUrl}"` : ''}
---

`;

  const markdownContent = htmlToMarkdown(story.content);
  return frontmatter + markdownContent;
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
    const path = isUpdate && story.githubPath ? story.githubPath : `stories/${generateFilename(story)}`;
    const content = generateMarkdown(story);
    
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
      const error = await response.json();
      console.error('GitHub API Error:', error);
      return {
        success: false,
        error: error.message || 'Failed to publish to GitHub',
      };
    }

    const result = await response.json();
    
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

    // Generate updated markdown with archived frontmatter
    const content = generateMarkdown(archivedStory);
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
      const error = await response.json();
      console.error('GitHub API Error:', error);
      return {
        success: false,
        error: error.message || 'Failed to archive on GitHub',
      };
    }

    const result = await response.json();

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

    // Generate updated markdown (will exclude archived fields)
    const content = generateMarkdown(unarchivedStory);
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
      const error = await response.json();
      console.error('GitHub API Error:', error);
      return {
        success: false,
        error: error.message || 'Failed to unarchive on GitHub',
      };
    }

    const result = await response.json();

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
      console.error('Failed to list stories:', await response.text());
      return [];
    }

    const files = await response.json();
    if (!Array.isArray(files)) return [];

    const stories: Story[] = [];

    // 2. Fetch content for each file
    for (const file of files) {
      if (file.name.endsWith('.md')) {
        const contentResponse = await fetch(file.download_url);
        if (contentResponse.ok) {
          const content = await contentResponse.text();
          const story = parseMarkdown(content, file.path);
          if (story) {
            stories.push(story);
          }
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
 * Parse markdown content into Story object
 */
const parseMarkdown = (content: string, path: string): Story | null => {
  try {
    const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
    const match = content.match(frontmatterRegex);
    
    if (!match) return null;
    
    const [, frontmatter, body] = match;
    const metadata: any = {};
    
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

    // Handle media list specifically if needed, but simple parsing for now
    // If media is a list, the above split might fail or capture just the first line
    // A more robust parser would be better but this suffices for the generated format

    // Convert markdown body back to HTML (simplified)
    const htmlContent = body
      .split('\n\n')
      .map(p => p.trim())
      .filter(p => p)
      .map(p => {
        if (p.startsWith('# ')) return `<h1>${p.slice(2)}</h1>`;
        if (p.startsWith('## ')) return `<h2>${p.slice(3)}</h2>`;
        if (p.startsWith('### ')) return `<h3>${p.slice(4)}</h3>`;
        if (p.startsWith('- ')) return `<ul>${p.split('\n').map(li => `<li>${li.slice(2)}</li>`).join('')}</ul>`;
        if (p.startsWith('> ')) return `<blockquote>${p.slice(2)}</blockquote>`;
        return `<p>${p}</p>`;
      })
      .join('');

    return {
      id: path.replace('stories/', '').replace('.md', ''),
      title: metadata.title || 'Untitled',
      date: metadata.date || new Date().toISOString(),
      location: metadata.location || '',
      content: htmlContent,
      images: [], 
      albumShareUrl: metadata.media ? metadata.media.replace('- ', '').trim() : undefined,
      isDraft: false,
      isPublished: true,
      publishedAt: metadata.date,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      githubPath: path,
      archived: metadata.archived === 'true',
      archivedAt: metadata.archivedAt,
    };
  } catch (error) {
    console.error('Error parsing markdown:', error);
    return null;
  }
};

