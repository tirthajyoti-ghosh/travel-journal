import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { 
  ReenieBeanie_400Regular 
} from '@expo-google-fonts/reenie-beanie';
import { 
  Lora_400Regular, 
  Lora_500Medium 
} from '@expo-google-fonts/lora';
import { 
  Inter_400Regular, 
  Inter_500Medium 
} from '@expo-google-fonts/inter';
import 'react-native-reanimated';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    ReenieBeanie_400Regular,
    Lora_400Regular,
    Lora_500Medium,
    Inter_400Regular,
    Inter_500Medium,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="editor" />
        <Stack.Screen name="viewer/[id]" />
      </Stack>
      <StatusBar style="dark" />
    </>
  );
}
