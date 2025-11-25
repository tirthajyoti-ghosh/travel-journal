import { GoogleSignin } from '@react-native-google-signin/google-signin';
import * as SecureStore from 'expo-secure-store';
import { GOOGLE_CONFIG } from '@/constants/google';

const TOKEN_KEY = 'google_access_token';
const TOKEN_EXPIRY_KEY = 'google_token_expiry';

// Configure Google Sign-In
GoogleSignin.configure({
  webClientId: GOOGLE_CONFIG.androidClientId,
  scopes: GOOGLE_CONFIG.scopes,
  offlineAccess: true,
});

/**
 * Sign in to Google Photos using native account picker
 */
export async function signInToGoogle(): Promise<string | null> {
  try {
    // Check if Google Play Services are available
    await GoogleSignin.hasPlayServices();
    
    // Sign in - this will show the native account picker
    const userInfo = await GoogleSignin.signIn();
    
    // Get access token
    const tokens = await GoogleSignin.getTokens();
    const accessToken = tokens.accessToken;
    
    // Store token securely
    await SecureStore.setItemAsync(TOKEN_KEY, accessToken);
    
    // Calculate and store expiry (tokens typically valid for 1 hour)
    const expiryTime = Date.now() + (3600 * 1000);
    await SecureStore.setItemAsync(TOKEN_EXPIRY_KEY, expiryTime.toString());
    
    return accessToken;
  } catch (error: any) {
    console.error('Google sign in error:', error);
    if (error.code === 'SIGN_IN_CANCELLED') {
      console.log('User cancelled sign in');
    } else if (error.code === 'IN_PROGRESS') {
      console.log('Sign in already in progress');
    } else if (error.code === 'PLAY_SERVICES_NOT_AVAILABLE') {
      console.log('Play services not available');
    }
    return null;
  }
}

/**
 * Get stored access token
 */
export async function getAccessToken(): Promise<string | null> {
  try {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    const expiry = await SecureStore.getItemAsync(TOKEN_EXPIRY_KEY);
    
    if (!token || !expiry) {
      return null;
    }
    
    // Check if token is expired
    if (Date.now() > parseInt(expiry)) {
      await clearToken();
      return null;
    }
    
    return token;
  } catch (error) {
    console.error('Error getting access token:', error);
    return null;
  }
}

/**
 * Check if user is signed in
 */
export async function isSignedIn(): Promise<boolean> {
  const token = await getAccessToken();
  return token !== null;
}

/**
 * Sign out (clear stored token and Google Sign-In session)
 */
export async function signOut(): Promise<void> {
  try {
    await GoogleSignin.signOut();
  } catch (error) {
    console.error('Error signing out from Google:', error);
  }
  await clearToken();
}

/**
 * Clear stored token
 */
async function clearToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(TOKEN_EXPIRY_KEY);
}
