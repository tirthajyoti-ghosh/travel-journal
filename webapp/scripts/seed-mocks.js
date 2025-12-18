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
  
  // Generate real coordinates for the map (Southeast Asia Focus)
  // Lat: -10 to 25, Long: 95 to 140
  const coordinates = [
    faker.location.longitude({ min: 95, max: 140 }),
    faker.location.latitude({ min: -10, max: 25 })
  ];
  
  // Generate real-looking image URLs from Picsum
  // We use a seed to ensure the same URL always gives the same image (good for caching)
  // but we want different images for different items.
  const numMedia = faker.number.int({ min: 5, max: 8 });
  const media = Array.from({ length: numMedia }).map(() => 
    `https://picsum.photos/seed/${faker.string.uuid()}/800/600`
  );

  const tags = [faker.word.noun(), faker.word.noun()];

  const frontmatter = `---
title: "${title}"
date: "${date}"
slug: "${slug}"
location: "${location}"
coordinates: [${coordinates[0]}, ${coordinates[1]}]
album_share_url: "https://photos.app.goo.gl/album-${faker.string.alphanumeric(8)}"
media_item_ids:
${media.map(m => `  - "${m}"`).join('\n')}
tags:
${tags.map(t => `  - ${t}`).join('\n')}
draft: false
---`;

  // Inject multiple images into the body
  const bodyImages = Array.from({ length: 5 }).map(() => 
    `https://picsum.photos/seed/${faker.string.uuid()}/800/400`
  );
  
  // Sample video URL (Big Buck Bunny)
  const videoUrl = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
  const videoThumbnail = `https://picsum.photos/seed/${faker.string.uuid()}/800/400`;

  const body = `
<h1>${title}</h1>

<p>${faker.lorem.paragraph()}</p>
<p>${faker.lorem.paragraph()}</p>

<img src="${bodyImages[0]}" alt="${faker.lorem.words(3)}" />

<p>${faker.lorem.paragraph()}</p>

<img src="${bodyImages[1]}" alt="${faker.lorem.words(3)}" />

<h2>${faker.lorem.sentence()}</h2>

<p>${faker.lorem.paragraph()}</p>

<!-- Video Example -->
<img src="${videoThumbnail}" title="video:${videoUrl}" data-video-thumbnail="true" />
<video src="${videoUrl}" controls playsinline></video>

<p>${faker.lorem.paragraph()}</p>

<blockquote>${faker.lorem.sentence()}</blockquote>

<p>${faker.lorem.paragraph()}</p>

<img src="${bodyImages[3]}" alt="${faker.lorem.words(3)}" />

<p>${faker.lorem.paragraph()}</p>

<h3>${faker.lorem.sentence()}</h3>

<p>${faker.lorem.paragraph()}</p>

<strong>${faker.lorem.sentence()}</strong>

<p>${faker.lorem.paragraph()}</p>

<img src="${bodyImages[4]}" alt="${faker.lorem.words(3)}" />

<p>${faker.lorem.paragraph()}</p>
`;

  return {
    filename: `${slug}.html`,
    content: `${frontmatter}\n${body}`
  };
};

// Clear existing stories
if (fs.existsSync(STORIES_DIR)) {
    const files = fs.readdirSync(STORIES_DIR);
    for (const file of files) {
      if (file.endsWith('.md') || file.endsWith('.html')) {
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
