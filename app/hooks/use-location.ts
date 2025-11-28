import { useState, useEffect } from 'react';
import * as Location from 'expo-location';

export interface LocationResult {
  location: string | null;
  loading: boolean;
  error: string | null;
}

/**
 * Hook to detect current location using GPS
 * Returns formatted location as "City, Country"
 */
export const useLocation = () => {
  const [result, setResult] = useState<LocationResult>({
    location: null,
    loading: false,
    error: null,
  });

  const detectLocation = async () => {
    setResult({ location: null, loading: true, error: null });

    try {
      // Request foreground permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        setResult({
          location: null,
          loading: false,
          error: 'Location permission needed',
        });
        return;
      }

      // Get current position with timeout
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 5000,
        distanceInterval: 0,
      }).catch((positionError) => {
        // Handle specific location service errors
        const errorMessage = positionError?.message || '';
        
        if (errorMessage.includes('location services')) {
          throw new Error('Enable location services in Settings');
        } else if (errorMessage.includes('unavailable')) {
          throw new Error('Location unavailable');
        } else {
          throw new Error('Could not get your location');
        }
      });

      // Reverse geocode to get city and country
      const [geocode] = await Location.reverseGeocodeAsync({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      }).catch(() => {
        // If geocoding fails, we still have coordinates
        throw new Error('Could not identify location');
      });

      if (geocode) {
        // Format as "City, Country"
        const city = geocode.city || geocode.subregion || geocode.region;
        const country = geocode.country;
        
        if (city && country) {
          setResult({
            location: `${city}, ${country}`,
            loading: false,
            error: null,
          });
        } else if (city || country) {
          // Fallback to whatever we have
          setResult({
            location: city || country || 'Unknown',
            loading: false,
            error: null,
          });
        } else {
          setResult({
            location: null,
            loading: false,
            error: 'Could not identify location',
          });
        }
      } else {
        setResult({
          location: null,
          loading: false,
          error: 'Could not identify location',
        });
      }
    } catch (error) {
      console.log('Location detection failed:', error);
      setResult({
        location: null,
        loading: false,
        error: error instanceof Error ? error.message : 'Location unavailable',
      });
    }
  };

  return {
    ...result,
    detectLocation,
  };
};
