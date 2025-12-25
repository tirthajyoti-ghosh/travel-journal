import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Keyboard,
  Modal,
  Pressable,
} from 'react-native';
import { FlatList } from 'react-native-gesture-handler';
import { MagnifyingGlassIcon, MapPinIcon } from 'phosphor-react-native';
import { colors } from '@/theme/colors';
import { searchCities, SearchResult, isSearchServiceReady, initializeSearchService } from '@/services/citySearchService';
import { isCityDataAvailable, initializeCityData, InitProgress } from '@/services/cityDataDownloader';

export interface CityAutocompleteProps {
  value: string;
  onLocationSelect: (location: string, coordinates: [number, number]) => void;
  onGPSPress?: () => void;
  placeholder?: string;
  style?: any;
  gpsDetecting?: boolean;
}

export function CityAutocomplete({
  value,
  onLocationSelect,
  onGPSPress,
  placeholder = 'Search city...',
  style,
  gpsDetecting = false,
}: CityAutocompleteProps) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<InitProgress | null>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<TextInput>(null);

  // Sync internal query state when value prop changes (e.g., from GPS detection)
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Check if city data needs to be downloaded
  useEffect(() => {
    checkAndInitialize();
  }, []);

  const checkAndInitialize = async () => {
    try {
      const dataAvailable = await isCityDataAvailable();
      
      if (!dataAvailable) {
        // Show download modal on first use
        return;
      }

      if (!isSearchServiceReady()) {
        setIsInitializing(true);
        await initializeSearchService();
        setIsInitializing(false);
      }
    } catch (error) {
      console.error('Error checking city data:', error);
    }
  };

  const handleDownloadData = async () => {
    setShowDownloadModal(true);
    
    try {
      await initializeCityData((progress: InitProgress) => {
        setDownloadProgress(progress);
      });

      // Initialize search service after setup
      await initializeSearchService();
      setShowDownloadModal(false);
      setDownloadProgress(null);
    } catch (error) {
      console.error('Error initializing city data:', error);
      setShowDownloadModal(false);
      setDownloadProgress(null);
    }
  };

  const handleTextChange = (text: string) => {
    setQuery(text);

    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Debounce search
    if (text.length >= 2) {
      setIsSearching(true);
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          if (!isSearchServiceReady()) {
            // Show download prompt
            setShowDownloadModal(true);
            return;
          }

          const searchResults = await searchCities(text, { maxResults: 50 });
          setResults(searchResults);
          setShowDropdown(searchResults.length > 0);
        } catch (error) {
          console.error('Search error:', error);
          setResults([]);
        } finally {
          setIsSearching(false);
        }
      }, 300);
    } else {
      setResults([]);
      setShowDropdown(false);
      setIsSearching(false);
    }
  };

  const handleSelectCity = (result: SearchResult) => {
    setQuery(result.displayName);
    onLocationSelect(result.displayName, result.coordinates);
    setResults([]);
    setShowDropdown(false);
    Keyboard.dismiss();
  };

  const handleGPSPress = () => {
    setResults([]);
    setShowDropdown(false);
    onGPSPress?.();
  };

  const renderDownloadModal = () => (
    <Modal
      visible={showDownloadModal}
      transparent
      animationType="fade"
      onRequestClose={() => {}}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>City Database Setup</Text>
          
          {!downloadProgress ? (
            <>
              <Text style={styles.modalText}>
                To enable city search with autocomplete, we'll set up a database of 153,728 cities worldwide.
              </Text>
              <Text style={styles.modalSubtext}>
                Size: ~18MB (bundled with app)
              </Text>
              <Text style={styles.modalSubtext}>
                This takes just a moment - one-time setup.
              </Text>
              
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonSecondary]}
                  onPress={() => setShowDownloadModal(false)}
                >
                  <Text style={styles.modalButtonTextSecondary}>Not Now</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonPrimary]}
                  onPress={handleDownloadData}
                >
                  <Text style={styles.modalButtonText}>Set Up</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <ActivityIndicator size="large" color={colors.accent} style={styles.modalLoader} />
              <Text style={styles.modalProgressText}>{downloadProgress.message}</Text>
            </>
          )}
        </View>
      </View>
    </Modal>
  );

  const renderResultItem = ({ item }: { item: SearchResult }) => (
    <TouchableOpacity
      style={styles.resultItem}
      onPress={() => handleSelectCity(item)}
    >
      <View style={styles.resultIconContainer}>
        <MapPinIcon size={18} color={colors.gray} />
      </View>
      <View style={styles.resultTextContainer}>
        <Text style={styles.resultCity}>{item.city}</Text>
        <Text style={styles.resultDetails}>
          {item.state ? `${item.state}, ` : ''}{item.country}
        </Text>
      </View>
      <View style={styles.resultFlag}>
        <Text style={styles.flagEmoji}>{getFlagEmoji(item.countryCode)}</Text>
      </View>
    </TouchableOpacity>
  );

  if (isInitializing) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.initializingContainer}>
          <ActivityIndicator size="small" color={colors.accent} />
          <Text style={styles.initializingText}>Loading city database...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <View style={styles.inputContainer}>
        <MagnifyingGlassIcon size={18} color={colors.gray} style={styles.searchIcon} />
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={query}
          onChangeText={handleTextChange}
          placeholder={placeholder}
          placeholderTextColor={colors.gray}
          autoCapitalize="words"
          autoCorrect={false}
          onFocus={() => {
            if (results.length > 0) {
              setShowDropdown(true);
            }
          }}
        />
        {isSearching && <ActivityIndicator size="small" color={colors.accent} style={styles.loader} />}
        {onGPSPress && (
          <TouchableOpacity
            style={styles.gpsButton}
            onPress={handleGPSPress}
            disabled={gpsDetecting}
          >
            {gpsDetecting ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : (
              <MapPinIcon size={22} color={colors.accent} />
            )}
          </TouchableOpacity>
        )}
      </View>

      {showDropdown && results.length > 0 && (
        <View style={styles.dropdownContainer}>
          <FlatList
            data={results}
            renderItem={renderResultItem}
            keyExtractor={(item, index) => `${item.city}-${item.countryCode}-${index}`}
            style={styles.resultsList}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
          />
        </View>
      )}

      {renderDownloadModal()}
    </View>
  );
}

// Helper function to get flag emoji from country code
function getFlagEmoji(countryCode: string): string {
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 1000,
  },
  initializingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: colors.paper,
    borderRadius: 8,
    gap: 8,
  },
  initializingText: {
    fontSize: 14,
    color: colors.gray,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.paper,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
    width: '100%',
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    paddingVertical: 0,
  },
  loader: {
    marginLeft: 8,
  },
  gpsButton: {
    marginLeft: 8,
    padding: 4,
  },
  dropdownContainer: {
    position: 'absolute',
    top: 48,
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    borderRadius: 8,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    maxHeight: 300,
    zIndex: 1001,
    overflow: 'hidden',
  },
  resultsList: {
    flex: 1,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.lines,
  },
  resultIconContainer: {
    marginRight: 12,
  },
  resultTextContainer: {
    flex: 1,
  },
  resultCity: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 2,
  },
  resultDetails: {
    fontSize: 13,
    color: colors.gray,
  },
  resultFlag: {
    marginLeft: 8,
  },
  flagEmoji: {
    fontSize: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'stretch',
    paddingHorizontal: 16,
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 16,
    color: colors.text,
    marginBottom: 8,
    lineHeight: 22,
  },
  modalSubtext: {
    fontSize: 14,
    color: colors.gray,
    marginBottom: 4,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonPrimary: {
    backgroundColor: colors.accent,
  },
  modalButtonSecondary: {
    backgroundColor: colors.lines,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  modalButtonTextSecondary: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  modalLoader: {
    marginVertical: 20,
  },
  modalProgressText: {
    fontSize: 14,
    color: colors.text,
    textAlign: 'center',
    marginTop: 12,
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: colors.lines,
    borderRadius: 2,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.accent,
  },
});
