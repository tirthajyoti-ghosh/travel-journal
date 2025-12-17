import {
  documentDirectory,
  getInfoAsync,
  deleteAsync,
  makeDirectoryAsync,
  copyAsync,
} from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Asset } from 'expo-asset';

// Use bundled SQLite database instead of downloading
const getCitiesDbPath = () => `${documentDirectory}SQLite/cities.db`;
const METADATA_KEY = '@city_data_metadata';

export interface CityMetadata {
  initializedAt: string;
  version: string;
  cityCount: number;
  fileSizeBytes: number;
}

export interface City {
  id: number;
  name: string;
  country: string;
  country_code: string;
  state: string | null;
  latitude: number;
  longitude: number;
}

export interface InitProgress {
  phase: 'copying' | 'complete';
  message: string;
}

/**
 * Check if city database exists locally
 */
export async function isCityDataAvailable(): Promise<boolean> {
  try {
    const fileInfo = await getInfoAsync(getCitiesDbPath());
    return fileInfo.exists;
  } catch (error) {
    console.error('Error checking city data availability:', error);
    return false;
  }
}

/**
 * Get city data metadata
 */
export async function getCityMetadata(): Promise<CityMetadata | null> {
  try {
    const metadataJson = await AsyncStorage.getItem(METADATA_KEY);
    return metadataJson ? JSON.parse(metadataJson) : null;
  } catch (error) {
    console.error('Error getting city metadata:', error);
    return null;
  }
}

/**
 * Initialize city database by copying from bundled assets
 */
export async function initializeCityData(
  onProgress?: (progress: InitProgress) => void
): Promise<void> {
  try {
    onProgress?.({
      phase: 'copying',
      message: 'Setting up city database...',
    });

    // Load the bundled database asset
    const asset = Asset.fromModule(require('../assets/cities.db'));
    await asset.downloadAsync();

    if (!asset.localUri) {
      throw new Error('Failed to load bundled database');
    }

    // Ensure SQLite directory exists
    const dbDir = `${documentDirectory}SQLite`;
    const dirInfo = await getInfoAsync(dbDir);
    if (!dirInfo.exists) {
      await makeDirectoryAsync(dbDir, { intermediates: true });
    }

    // Copy database to app directory
    await copyAsync({
      from: asset.localUri,
      to: getCitiesDbPath(),
    });

    // Save metadata
    const fileInfo = await getInfoAsync(getCitiesDbPath());
    const metadata: CityMetadata = {
      initializedAt: new Date().toISOString(),
      version: '1.0.0',
      cityCount: 153728,
      fileSizeBytes: fileInfo.exists && 'size' in fileInfo ? fileInfo.size : 0,
    };
    await AsyncStorage.setItem(METADATA_KEY, JSON.stringify(metadata));

    onProgress?.({
      phase: 'complete',
      message: 'Database ready!',
    });

    console.log('City database initialized successfully');
  } catch (error) {
    console.error('Error initializing city data:', error);
    throw error;
  }
}

/**
 * Get the path to the city database
 */
export function getCityDatabasePath(): string {
  return getCitiesDbPath();
}

/**
 * Delete local city data
 */
export async function deleteCityData(): Promise<void> {
  try {
    await deleteAsync(getCitiesDbPath(), { idempotent: true });
    await AsyncStorage.removeItem(METADATA_KEY);
    console.log('City data deleted');
  } catch (error) {
    console.error('Error deleting city data:', error);
    throw error;
  }
}
