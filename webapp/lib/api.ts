import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const CONTENT_DIR = process.env.CONTENT_DIR 
  ? path.resolve(process.cwd(), process.env.CONTENT_DIR) 
  : path.join(process.cwd(), '../stories');

export interface Story {
  slug: string;
  title: string;
  date: string;
  location: string;
  album_share_url?: string;
  media_item_ids?: string[];
  tags?: string[];
  content: string;
  draft?: boolean;
}

export function getStorySlugs() {
  if (!fs.existsSync(CONTENT_DIR)) {
    return [];
  }
  return fs.readdirSync(CONTENT_DIR).filter((file) => file.endsWith('.md'));
}

export function getStoryBySlug(slug: string): Story {
  const realSlug = slug.replace(/\.md$/, '');
  const fullPath = path.join(CONTENT_DIR, `${realSlug}.md`);
  const fileContents = fs.readFileSync(fullPath, 'utf8');
  const { data, content } = matter(fileContents);

  return {
    slug: realSlug,
    title: data.title,
    date: data.date,
    location: data.location,
    album_share_url: data.album_share_url,
    media_item_ids: data.media_item_ids,
    tags: data.tags,
    content,
    draft: data.draft,
  };
}

export function getAllStories(): Story[] {
  const slugs = getStorySlugs();
  const stories = slugs
    .map((slug) => getStoryBySlug(slug))
    // sort posts by date in descending order
    .sort((post1, post2) => (post1.date > post2.date ? -1 : 1));
  return stories;
}
