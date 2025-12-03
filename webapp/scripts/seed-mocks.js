const fs = require('fs');
const path = require('path');
const { faker } = require('@faker-js/faker');

// Stories are stored in the sibling directory "stories" relative to the webapp root
// webapp/scripts/seed-mocks.js -> webapp/stories (or root/stories?)
// The previous script put them in root/stories.
// Let's keep them in root/stories as per the docs (Repo B simulation).
// So from webapp/scripts/seed-mocks.js, we go ../../stories
const STORIES_DIR = path.join(__dirname, '../../stories');

if (!fs.existsSync(STORIES_DIR)) {
  fs.mkdirSync(STORIES_DIR, { recursive: true });
}

console.log(`🌱 Seeding mock stories into ${STORIES_DIR}...`);

const generateStory = () => {
  const title = faker.location.city() + ' ' + faker.word.adjective();
  const date = faker.date.past().toISOString().split('T')[0];
  const slug = title.toLowerCase().replace(/ /g, '-') + '-' + date;
  const location = `${faker.location.city()}, ${faker.location.country()}`;
  
  // Generate real-looking image URLs from Picsum
  // We use a seed to ensure the same URL always gives the same image (good for caching)
  // but we want different images for different items.
  const numMedia = faker.number.int({ min: 1, max: 3 });
  const media = Array.from({ length: numMedia }).map(() => 
    `https://picsum.photos/seed/${faker.string.uuid()}/800/600`
  );

  const tags = [faker.word.noun(), faker.word.noun()];

  const frontmatter = `---
title: "${title}"
date: "${date}"
slug: "${slug}"
location: "${location}"
album_share_url: "https://photos.app.goo.gl/album-${faker.string.alphanumeric(8)}"
media_item_ids:
${media.map(m => `  - "${m}"`).join('\n')}
tags:
${tags.map(t => `  - ${t}`).join('\n')}
draft: false
---`;

  // Inject an image into the body sometimes
  const bodyImage = `![Random Travel Moment](https://picsum.photos/seed/${faker.string.uuid()}/800/400)`;
  
  const body = `
# ${title}

${faker.lorem.paragraphs(2)}

${bodyImage}

## ${faker.lorem.sentence()}

${faker.lorem.paragraphs(2)}

> ${faker.lorem.sentence()}

${faker.lorem.paragraphs(1)}
`;

  return {
    filename: `${slug}.md`,
    content: `${frontmatter}\n${body}`
  };
};

// Clear existing stories
if (fs.existsSync(STORIES_DIR)) {
    const files = fs.readdirSync(STORIES_DIR);
    for (const file of files) {
      if (file.endsWith('.md')) {
        fs.unlinkSync(path.join(STORIES_DIR, file));
      }
    }
}

// Generate new ones
for (let i = 0; i < 10; i++) {
  const story = generateStory();
  fs.writeFileSync(path.join(STORIES_DIR, story.filename), story.content);
  console.log(`Created ${story.filename}`);
}

console.log('✅ Done!');
