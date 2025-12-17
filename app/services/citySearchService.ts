import * as SQLite from 'expo-sqlite';
import { City } from './cityDataDownloader';

export interface SearchResult {
  city: string;
  state?: string;
  country: string;
  countryCode: string;
  displayName: string;
  coordinates: [number, number];
}

let db: SQLite.SQLiteDatabase | null = null;

export async function initializeSearchService(): Promise<void> {
  if (db) {
    return;
  }

  try {
    db = await SQLite.openDatabaseAsync('cities.db');
    console.log('Search service initialized with SQLite database');
  } catch (error) {
    console.error('Error initializing search service:', error);
    throw error;
  }
}

export function clearSearchCache(): void {
  if (db) {
    db.closeSync();
    db = null;
  }
}

export function isSearchServiceReady(): boolean {
  return db !== null;
}

function formatDisplayName(city: City): string {
  if (city.state && city.state !== city.name) {
    return `${city.name}, ${city.state}, ${city.country}`;
  }
  return `${city.name}, ${city.country}`;
}

export async function searchCities(
  query: string,
  options: {
    maxResults?: number;
    countryCode?: string;
  } = {}
): Promise<SearchResult[]> {
  const { maxResults = 50, countryCode } = options;

  if (!db) {
    throw new Error('Search service not initialized. Call initializeSearchService() first.');
  }

  if (!query || query.trim().length < 2) {
    return [];
  }

  try {
    const searchTerm = query.trim();
    let sql = `
      SELECT id, name, country, country_code, state, latitude, longitude
      FROM cities
      WHERE name LIKE ?
    `;
    const params: any[] = [`${searchTerm}%`];

    if (countryCode) {
      sql += ` AND country_code = ?`;
      params.push(countryCode);
    }

    sql += ` ORDER BY name LIMIT ?`;
    params.push(maxResults);

    const rows = await db.getAllAsync<City>(sql, params);

    return rows.map(city => ({
      city: city.name,
      state: city.state || undefined,
      country: city.country,
      countryCode: city.country_code,
      displayName: formatDisplayName(city),
      coordinates: [city.longitude, city.latitude] as [number, number],
    }));
  } catch (error) {
    console.error('Error searching cities:', error);
    return [];
  }
}

export async function getCityByName(
  cityName: string,
  countryCode?: string
): Promise<SearchResult | null> {
  if (!db) {
    throw new Error('Search service not initialized. Call initializeSearchService() first.');
  }

  try {
    let sql = `SELECT id, name, country, country_code, state, latitude, longitude FROM cities WHERE name = ?`;
    const params: any[] = [cityName];

    if (countryCode) {
      sql += ` AND country_code = ?`;
      params.push(countryCode);
    }

    sql += ` LIMIT 1`;

    const city = await db.getFirstAsync<City>(sql, params);

    if (!city) {
      return null;
    }

    return {
      city: city.name,
      state: city.state || undefined,
      country: city.country,
      countryCode: city.country_code,
      displayName: formatDisplayName(city),
      coordinates: [city.longitude, city.latitude],
    };
  } catch (error) {
    console.error('Error getting city by name:', error);
    return null;
  }
}

export async function findNearestCity(
  latitude: number,
  longitude: number,
  maxDistanceKm: number = 50
): Promise<SearchResult | null> {
  if (!db) {
    throw new Error('Search service not initialized. Call initializeSearchService() first.');
  }

  try {
    const latRange = maxDistanceKm / 111;
    const lonRange = maxDistanceKm / (111 * Math.cos(latitude * Math.PI / 180));

    const sql = `
      SELECT id, name, country, country_code, state, latitude, longitude
      FROM cities
      WHERE latitude BETWEEN ? AND ?
        AND longitude BETWEEN ? AND ?
      LIMIT 100
    `;

    const rows = await db.getAllAsync<City>(sql, [
      latitude - latRange,
      latitude + latRange,
      longitude - lonRange,
      longitude + lonRange,
    ]);

    if (rows.length === 0) {
      return null;
    }

    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const R = 6371;

    let nearestCity: City | null = null;
    let minDistance = Infinity;

    for (const city of rows) {
      const dLat = toRad(city.latitude - latitude);
      const dLon = toRad(city.longitude - longitude);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(latitude)) * Math.cos(toRad(city.latitude)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = R * c;

      if (distance < minDistance && distance <= maxDistanceKm) {
        minDistance = distance;
        nearestCity = city;
      }
    }

    if (!nearestCity) {
      return null;
    }

    return {
      city: nearestCity.name,
      state: nearestCity.state || undefined,
      country: nearestCity.country,
      countryCode: nearestCity.country_code,
      displayName: formatDisplayName(nearestCity),
      coordinates: [nearestCity.longitude, nearestCity.latitude],
    };
  } catch (error) {
    console.error('Error finding nearest city:', error);
    return null;
  }
}

export async function getSearchStats(): Promise<{
  totalCities: number;
  countriesCount: number;
  isReady: boolean;
}> {
  if (!db) {
    return { totalCities: 0, countriesCount: 0, isReady: false };
  }

  try {
    const totalCitiesResult = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM cities');
    const countriesResult = await db.getFirstAsync<{ count: number }>('SELECT COUNT(DISTINCT country_code) as count FROM cities');

    return {
      totalCities: totalCitiesResult?.count || 0,
      countriesCount: countriesResult?.count || 0,
      isReady: true,
    };
  } catch (error) {
    console.error('Error getting search stats:', error);
    return { totalCities: 0, countriesCount: 0, isReady: false };
  }
}
