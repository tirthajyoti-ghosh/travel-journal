#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

console.log('🚀 Starting city database generation...\n');

// Read the downloaded JSON file
console.log('📖 Reading city data...');
const rawData = JSON.parse(fs.readFileSync(path.join(__dirname, '../cities-data.json'), 'utf8'));

// The file is an array of countries with nested states and cities
const countries = Array.isArray(rawData) ? rawData : [rawData];
const cities = [];

console.log('🔄 Extracting cities from countries and states...');
for (const country of countries) {
  if (country.states && Array.isArray(country.states)) {
    for (const state of country.states) {
      if (state.cities && Array.isArray(state.cities)) {
        for (const city of state.cities) {
          cities.push({
            ...city,
            country_name: country.name,
            country_code: country.iso2,
            state_name: state.name,
          });
        }
      }
    }
  }
}

console.log(`✅ Extracted ${cities.length} cities from ${countries.length} countries\n`);

// Create SQLite database
const dbPath = path.join(__dirname, '../app/assets/cities.db');
console.log(`📦 Creating SQLite database at: ${dbPath}`);

// Remove existing database if it exists
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
}

const db = new Database(dbPath);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

// Create table with optimized schema
console.log('🏗️  Creating database schema...');
db.exec(`
  CREATE TABLE cities (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    country TEXT NOT NULL,
    country_code TEXT NOT NULL,
    state TEXT,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL
  );

  CREATE INDEX idx_name ON cities(name);
  CREATE INDEX idx_country ON cities(country);
  CREATE INDEX idx_country_code ON cities(country_code);
`);

// Prepare insert statement
const insert = db.prepare(`
  INSERT INTO cities (id, name, country, country_code, state, latitude, longitude)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

// Insert cities in batches for better performance
console.log('💾 Inserting city data...');
const batchSize = 1000;
let processed = 0;

const insertMany = db.transaction((cities) => {
  for (const city of cities) {
    insert.run(
      city.id,
      city.name,
      city.country_name,
      city.country_code,
      city.state_name || null,
      parseFloat(city.latitude),
      parseFloat(city.longitude)
    );
  }
});

for (let i = 0; i < cities.length; i += batchSize) {
  const batch = cities.slice(i, i + batchSize);
  insertMany(batch);
  processed += batch.length;
  
  if (processed % 10000 === 0) {
    console.log(`   Processed ${processed.toLocaleString()} / ${cities.length.toLocaleString()} cities...`);
  }
}

console.log(`✅ Inserted ${processed.toLocaleString()} cities\n`);

// Optimize database
console.log('⚡ Optimizing database...');
db.pragma('optimize');
db.close();

// Check final file size
const stats = fs.statSync(dbPath);
const fileSizeMB = (stats.size / 1024 / 1024).toFixed(2);
console.log(`\n✨ Database created successfully!`);
console.log(`   Size: ${fileSizeMB} MB`);
console.log(`   Location: ${dbPath}\n`);

// Clean up the raw JSON file
console.log('🧹 Cleaning up temporary files...');
const jsonPath = path.join(__dirname, '../cities-data.json');
if (fs.existsSync(jsonPath)) {
  fs.unlinkSync(jsonPath);
  console.log('   Removed cities-data.json\n');
}

console.log('🎉 Done! The database is ready to be committed to the repo.');
