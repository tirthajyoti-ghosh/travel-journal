export interface Story {
  id: string;
  title: string;
  date: string;
  location: string;
  content: string;
  coverImage?: string;
  images: string[];
  isDraft: boolean;
  createdAt: string;
  updatedAt: string;
}
