export interface Story {
  id: string;
  title: string;
  date: string;
  location: string;
  content: string;
  coverImage?: string;
  images: string[];
  albumShareUrl?: string;
  isDraft: boolean;
  createdAt: string;
  updatedAt: string;
  isPublished?: boolean;
  publishedAt?: string;
  githubPath?: string;
  archived?: boolean;
  archivedAt?: string;
}

export interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
  branch: string; // Stored but overridden by environment in publishStory
}
