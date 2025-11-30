import { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, ScrollView, Switch, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import Feather from '@expo/vector-icons/Feather';
import * as githubService from '@/services/githubService';
import * as storageService from '@/services/storageService';
import { GitHubConfig } from '@/types';
import { GITHUB_OWNER, GITHUB_REPO } from '@/constants/github';

/**
 * Settings Screen - GitHub Configuration
 * 
 * ⚠️ SECURITY: GitHub tokens are stored encrypted in AsyncStorage
 * and NEVER committed to version control. Always use fine-grained
 * tokens with minimal permissions (Contents: Read & Write only).
 */

export default function SettingsScreen() {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);

  const targetBranch = githubService.getTargetBranch();

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    const config = await githubService.loadGitHubConfig();
    if (config) {
      setToken(config.token);
    }
  };

  const handleSave = async () => {
    if (!token.trim()) {
      Alert.alert('Missing Information', 'Please enter your GitHub token');
      return;
    }

    setLoading(true);
    try {
      const config: GitHubConfig = {
        token: token.trim(),
        owner: GITHUB_OWNER,
        repo: GITHUB_REPO,
        branch: targetBranch,
      };

      await githubService.saveGitHubConfig(config);
      Alert.alert('Success', 'GitHub configuration saved!');
    } catch (error) {
      console.error('Failed to save config:', error);
      Alert.alert('Error', 'Failed to save configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    if (!token.trim()) {
      Alert.alert('Missing Information', 'Please enter your GitHub token first');
      return;
    }

    setTesting(true);
    try {
      const config: GitHubConfig = {
        token: token.trim(),
        owner: GITHUB_OWNER,
        repo: GITHUB_REPO,
        branch: targetBranch,
      };

      const success = await githubService.testGitHubConnection(config);
      
      if (success) {
        Alert.alert('Success', 'Connection to GitHub successful! ✓');
      } else {
        Alert.alert('Failed', 'Could not connect to repository. Please check your token and repository details.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to test connection');
    } finally {
      setTesting(false);
    }
  };

  const handleClearCache = () => {
    Alert.alert(
      'Clear Cache & Refresh',
      'This will delete all local data (including drafts!) and re-download published stories from GitHub. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear & Refresh',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              // 1. Clear local storage
              await storageService.clearAllStories();
              
              // 2. Fetch from GitHub
              const stories = await githubService.fetchAllStories();
              
              // 3. Save to local storage
              await storageService.saveStories(stories);
              
              Alert.alert('Success', `Cache cleared and ${stories.length} stories restored.`);
            } catch (error) {
              console.error(error);
              Alert.alert('Error', 'Failed to refresh stories');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Feather name="arrow-left" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollContainer}>
          <View style={styles.envBanner}>
            <View style={styles.envBadge}>
              <Text style={styles.envBadgeText}>{__DEV__ ? 'DEV' : 'PROD'}</Text>
            </View>
            <View style={styles.envInfo}>
              <Text style={styles.envTitle}>Environment Mode</Text>
              <Text style={styles.envDescription}>
                {__DEV__ ? `Publishing to ${targetBranch} branch` : `Publishing to ${targetBranch} branch`}
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Content</Text>
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => router.push('/archived')}
            >
              <View style={styles.menuItemLeft}>
                <Feather name="archive" size={20} color={colors.text} />
                <Text style={styles.menuItemText}>Archived Stories</Text>
              </View>
              <Feather name="chevron-right" size={20} color={colors.gray} />
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>GitHub Configuration</Text>
            <Text style={styles.sectionDescription}>
              Repository: {GITHUB_OWNER}/{GITHUB_REPO}
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>GitHub Personal Access Token *</Text>
            <TextInput
              style={styles.input}
              placeholder="github_pat_..."
              placeholderTextColor={colors.lines}
              value={token}
              onChangeText={setToken}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={styles.hint}>
              Fine-grained token with Contents read/write permission
            </Text>
          </View>

          <View style={styles.buttonGroup}>
            <TouchableOpacity 
              style={[styles.testButton, testing && styles.buttonDisabled]}
              onPress={handleTest}
              disabled={testing}
            >
              <Feather name="wifi" size={20} color={colors.text} />
              <Text style={styles.testButtonText}>
                {testing ? 'Testing...' : 'Test Connection'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.saveButton, loading && styles.buttonDisabled]}
              onPress={handleSave}
              disabled={loading}
            >
              <Text style={styles.saveButtonText}>
                {loading ? 'Saving...' : 'Save Configuration'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.infoBox}>
            <Feather name="info" size={16} color={colors.accent} />
            <Text style={styles.infoText}>
              Your token is stored securely on your device and never shared.
            </Text>
          </View>

          {/* Option 8: #EF6351 - Bittersweet */}
          <View style={[styles.dangerZone, { backgroundColor: '#FFF5F3', borderColor: '#F8C7BE' }]}>
            <View style={styles.dangerHeader}>
              <Feather name="alert-triangle" size={20} color="#EF6351" />
              <Text style={[styles.dangerTitle, { color: '#EF6351' }]}>Danger Zone</Text>
            </View>
            <Text style={styles.dangerDescription}>
              This will delete all local drafts and re-download published stories from GitHub.
            </Text>
            <TouchableOpacity 
              style={[styles.dangerButton, { backgroundColor: '#EF6351' }]}
              onPress={handleClearCache}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.dangerButtonText}>Clear Cache & Refresh</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.lines,
  },
  headerTitle: {
    fontFamily: typography.fonts.display,
    fontSize: 20,
    color: colors.text,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContainer: {
    padding: 20,
  },
  envBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: __DEV__ ? colors.accent + '15' : '#4CAF50' + '15',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: __DEV__ ? colors.accent : '#4CAF50',
    marginBottom: 24,
  },
  envBadge: {
    backgroundColor: __DEV__ ? colors.accent : '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginRight: 12,
  },
  envBadgeText: {
    color: colors.white,
    fontFamily: typography.fonts.ui,
    fontSize: 12,
    fontWeight: '700',
  },
  envInfo: {
    flex: 1,
  },
  envTitle: {
    fontFamily: typography.fonts.ui,
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
    marginBottom: 4,
  },
  envDescription: {
    fontFamily: typography.fonts.caption,
    fontSize: 12,
    color: colors.text,
    opacity: 0.7,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontFamily: typography.fonts.display,
    fontSize: 24,
    color: colors.text,
    marginBottom: 8,
  },
  sectionDescription: {
    fontFamily: typography.fonts.body,
    fontSize: 14,
    color: colors.text,
    opacity: 0.6,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontFamily: typography.fonts.ui,
    fontSize: 14,
    color: colors.text,
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    fontFamily: typography.fonts.body,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.white,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.lines,
  },
  hint: {
    fontFamily: typography.fonts.caption,
    fontSize: 12,
    color: colors.text,
    opacity: 0.6,
    marginTop: 4,
  },
  buttonGroup: {
    gap: 12,
    marginBottom: 24,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.white,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  testButtonText: {
    fontFamily: typography.fonts.ui,
    fontSize: 16,
    color: colors.text,
  },
  saveButton: {
    backgroundColor: colors.accent,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    fontFamily: typography.fonts.ui,
    fontSize: 16,
    color: colors.white,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: colors.accent + '10',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.accent + '30',
  },
  infoText: {
    flex: 1,
    fontFamily: typography.fonts.caption,
    fontSize: 12,
    color: colors.text,
    lineHeight: 18,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.lines,
    marginBottom: 12,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuItemText: {
    fontFamily: typography.fonts.ui,
    fontSize: 16,
    color: colors.text,
  },
  dangerZone: {
    marginTop: 32,
    backgroundColor: '#FAF0ED', // warm peachy background
    borderWidth: 2,
    borderColor: '#E8BFB3', // warm terracotta border
    borderRadius: 12,
    padding: 16,
  },
  dangerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  dangerTitle: {
    fontFamily: typography.fonts.display,
    fontSize: 20,
    color: '#CE6A52',
  },
  dangerDescription: {
    fontFamily: typography.fonts.body,
    fontSize: 13,
    color: colors.text,
    opacity: 0.75,
    marginBottom: 16,
    lineHeight: 20,
  },
  dangerButton: {
    backgroundColor: '#CE6A52',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  dangerButtonText: {
    fontFamily: typography.fonts.ui,
    fontSize: 14,
    color: colors.white,
    fontWeight: '600',
  },
});
