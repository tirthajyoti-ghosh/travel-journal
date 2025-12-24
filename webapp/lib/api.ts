import matter from 'gray-matter';

export interface Story {
  slug: string;
  title: string;
  date: string;
  location: string;
  coordinates?: [number, number];
  album_share_url?: string;
  media_item_ids?: string[];
  tags?: string[];
  content: string;
  draft?: boolean;
  contentType: 'markdown' | 'html';
}

// ============================================================================
// ENVIRONMENT DETECTION
// ============================================================================

/**
 * Check if we're running in production (server-side only)
 */
function isProduction(): boolean {
  // Check if we're on the server
  if (typeof window !== 'undefined') {
    return false; // Client-side, check public env var
  }
  
  // Server-side checks
  return (
    process.env.VERCEL_ENV === 'production' ||
    process.env.NODE_ENV === 'production' ||
    process.env.USE_GITHUB_STORIES === 'true'
  );
}

// ============================================================================
// GITHUB API (Production - Runtime)
// ============================================================================

interface GitHubFile {
  name: string;
  download_url: string;
  type: string;
}

/**
 * Fetch stories from public GitHub repository at RUNTIME
 * No authentication required for public repos
 */
async function fetchStoriesFromGitHub(): Promise<Story[]> {
  const owner = process.env.NEXT_PUBLIC_GITHUB_OWNER || process.env.GITHUB_OWNER;
  const repo = process.env.NEXT_PUBLIC_GITHUB_REPO || process.env.GITHUB_REPO;
  const branch = process.env.NEXT_PUBLIC_GITHUB_BRANCH || process.env.GITHUB_BRANCH || 'main';

  if (!owner || !repo) {
    console.warn('GitHub configuration missing. Set GITHUB_OWNER and GITHUB_REPO');
    return [];
  }

  console.log(`🌐 Fetching stories from GitHub: ${owner}/${repo} (${branch})`);

  try {
    const listUrl = `https://api.github.com/repos/${owner}/${repo}/contents/stories?ref=${branch}`;
    const listResponse = await fetch(listUrl, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
      },
      next: { revalidate: 60 }, // Cache for 60 seconds
    });

    if (!listResponse.ok) {
      console.error('Failed to fetch stories:', listResponse.status);
      return [];
    }

    const files: GitHubFile[] = await listResponse.json();
    
    if (!Array.isArray(files)) {
      console.error('Unexpected GitHub API response');
      return [];
    }

    // Filter for story files only
    const storyFiles = files.filter(file => 
      file.type === 'file' && (file.name.endsWith('.md') || file.name.endsWith('.html'))
    );

    console.log(`📚 Found ${storyFiles.length} story files`);

    // Fetch each story's content
    const storyPromises = storyFiles.map(async (file) => {
      try {
        const contentResponse = await fetch(file.download_url, {
          next: { revalidate: 60 },
        });
        
        if (!contentResponse.ok) {
          console.warn(`Failed to fetch: ${file.name}`);
          return null;
        }

        const content = await contentResponse.text();
        const { data, content: body } = matter(content);

        // Skip drafts and archived stories
        if (data.draft || data.archived) {
          return null;
        }

        const slug = file.name.replace(/\.(md|html)$/, '');
        const contentType: 'markdown' | 'html' = file.name.endsWith('.html') ? 'html' : 'markdown';

        const story: Story = {
          slug,
          title: data.title || 'Untitled',
          date: data.date || new Date().toISOString(),
          location: data.location || '',
          coordinates: data.coordinates,
          album_share_url: data.media?.[0],
          media_item_ids: data.media,
          tags: data.tags,
          content: body,
          draft: data.draft,
          contentType,
        };

        return story;
      } catch (error) {
        console.warn(`Error processing ${file.name}:`, error);
        return null;
      }
    });

    const stories = (await Promise.all(storyPromises)).filter((s): s is Story => s !== null);

    console.log(`✅ Loaded ${stories.length} published stories`);

    // Sort by date descending
    stories.sort((a, b) => (a.date > b.date ? -1 : 1));

    return stories;
  } catch (error) {
    console.error('Error fetching from GitHub:', error);
    return [];
  }
}

// ============================================================================
// FILESYSTEM API (Development - Local stories)
// ============================================================================

/**
 * Fetch stories from local filesystem (development only)
 * Server-side only
 */
async function fetchStoriesFromFilesystem(): Promise<Story[]> {
  // Dynamic import to avoid issues in production
  const fs = await import('fs');
  const path = await import('path');
  
  const CONTENT_DIR = process.env.CONTENT_DIR 
    ? path.resolve(process.cwd(), process.env.CONTENT_DIR) 
    : path.join(process.cwd(), '../stories');

  console.log(`🔧 Reading stories from local filesystem: ${CONTENT_DIR}`);

  if (!fs.existsSync(CONTENT_DIR)) {
    console.warn(`⚠️  Stories directory not found: ${CONTENT_DIR}`);
    return [];
  }

  const files = fs.readdirSync(CONTENT_DIR)
    .filter((file) => file.endsWith('.md') || file.endsWith('.html'));

  console.log(`📚 Found ${files.length} story files`);

  const stories: Story[] = files.map((filename) => {
    const slug = filename.replace(/\.(md|html)$/, '');
    const fullPath = path.join(CONTENT_DIR, filename);
    const fileContents = fs.readFileSync(fullPath, 'utf8');
    const { data, content } = matter(fileContents);
    const contentType: 'markdown' | 'html' = filename.endsWith('.html') ? 'html' : 'markdown';

    return {
      slug,
      title: data.title || 'Untitled',
      date: data.date || new Date().toISOString(),
      location: data.location || '',
      coordinates: data.coordinates,
      album_share_url: data.album_share_url,
      media_item_ids: data.media_item_ids,
      tags: data.tags,
      content,
      draft: data.draft,
      contentType,
    };
  });

  // Sort by date descending
  stories.sort((a, b) => (a.date > b.date ? -1 : 1));

  console.log(`✅ Loaded ${stories.length} local stories`);

  return stories;
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Get all published stories
 * - Development: Reads from local filesystem (../stories)
 * - Production: Fetches from GitHub at runtime
 */
export async function getAllStories(): Promise<Story[]> {
  if (isProduction()) {
    return await fetchStoriesFromGitHub();
  }
  
  return await fetchStoriesFromFilesystem();
}

/**
 * Get a single story by slug
 */
export async function getStoryBySlug(slug: string): Promise<Story> {
  const stories = await getAllStories();
  const story = stories.find(s => s.slug === slug);
  
  if (!story) {
    throw new Error(`Story not found: ${slug}`);
  }
  
  return story;
}
