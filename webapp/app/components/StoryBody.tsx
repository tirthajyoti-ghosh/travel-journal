import { ReactNode } from 'react';

interface StoryBodyProps {
  children: ReactNode;
}

export default function StoryBody({ children }: StoryBodyProps) {
  return (
    <article className="story-body">
      <div className="story-content">
        {children}
      </div>
    </article>
  );
}
