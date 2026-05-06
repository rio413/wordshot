import { useEffect } from 'react';
import { Stack, router, useSegments } from 'expo-router';
import messaging from '@react-native-firebase/messaging';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import 'react-native-reanimated';
import { AuthProvider, useAuth } from '@/lib/auth';
import {
  getInitialCardId,
  onForegroundCard,
  onNotificationOpened,
  registerForPush,
} from '@/lib/notifications';
import { palette } from '@/constants/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

// Must be registered at module level — RNFB requires this before React mounts.
// The Cloud Function sends a notification object so FCM displays the banner
// automatically; we don't need to do anything here for the MVP.
messaging().setBackgroundMessageHandler(async () => {});

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const [loaded, error] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
  });

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync().catch(() => {});
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: palette.neutralWarm }}>
      <SafeAreaProvider>
        <AuthProvider>
          <RoutingShell />
          <StatusBar style="dark" />
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function RoutingShell() {
  const { user, ready } = useAuth();
  const segments = useSegments();

  useEffect(() => {
    if (!ready) return;
    const inAuthGroup = segments[0] === '(auth)';
    if (!user && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (user && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [user, ready, segments]);

  useEffect(() => {
    if (!user) return;
    registerForPush(user.uid).catch(() => {});
    const unsubFg = onForegroundCard((cardId) => {
      router.push({ pathname: '/card/[id]', params: { id: cardId } });
    });
    const unsubOpen = onNotificationOpened((cardId) => {
      router.push({ pathname: '/card/[id]', params: { id: cardId } });
    });
    getInitialCardId().then((cardId) => {
      if (cardId) router.push({ pathname: '/card/[id]', params: { id: cardId } });
    });
    return () => {
      unsubFg();
      unsubOpen();
    };
  }, [user]);

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: palette.neutralWarm },
        headerShadowVisible: false,
        headerTitleStyle: { fontFamily: 'Inter-SemiBold', color: palette.textBlack },
        contentStyle: { backgroundColor: palette.neutralWarm },
      }}
    >
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="card/[id]"
        options={{ presentation: 'modal', headerShown: false }}
      />
      <Stack.Screen name="groups/index" options={{ title: 'My Groups' }} />
      <Stack.Screen name="groups/[id]" options={{ title: '' }} />
    </Stack>
  );
}
