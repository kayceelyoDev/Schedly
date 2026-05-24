import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { initDB } from '../db/database';
import { View, StyleSheet, Text, Image } from 'react-native';
import Animated, { FadeOut, BounceInUp, runOnJS, useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';

import * as SplashScreen from 'expo-splash-screen';



SplashScreen.preventAutoHideAsync().catch(() => {});

let Notifications: any;
try {
  Notifications = require('expo-notifications');
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
} catch (e) {
  console.warn("Expo Go does not support expo-notifications on Android SDK 53+. Please use a development build.");
}

import { SettingsProvider, useSettings } from '../context/SettingsContext';

// We need an inner component to consume the settings context for the splash screen background
function RootContent() {
  const { theme, ready } = useSettings();
  const [animationComplete, setAnimationComplete] = useState(false);
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const scale = useSharedValue(1);

  useEffect(() => {
    if (fontsLoaded && ready) {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.1, { duration: 600 }),
          withTiming(1, { duration: 600 })
        ),
        -1,
        true
      );
    }
  }, [fontsLoaded, ready]);

  const animatedLogoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handleSplashAnimationComplete = () => {
    setTimeout(() => {
      setAnimationComplete(true);
    }, 1200);
  };

  if (!fontsLoaded || !ready) {
    return null;
  }

  if (!animationComplete) {
    return (
      <View style={[styles.splashContainer, { backgroundColor: theme.BG_COLOR }]}>
        <Animated.View
          style={styles.splashLogoRow}
          entering={BounceInUp.duration(1200).withCallback((finished) => {
            if (finished) {
               runOnJS(handleSplashAnimationComplete)();
            }
          })}
          exiting={FadeOut.duration(400)}
        >
          <Animated.Image 
             source={require('../../assets/images/logo-only-with-out-bg.png')}
             style={[{ width: 130, height: 130, resizeMode: 'contain', marginBottom: 12 }, animatedLogoStyle]}
          />
        </Animated.View>
        <Animated.Text
          style={[styles.splashTagline, { color: theme.TEXT_MUTED }]}
          entering={BounceInUp.delay(300).duration(1000)}
          exiting={FadeOut.duration(400)}
        >
          Your TikTok affiliate scheduler
        </Animated.Text>
      </View>
    );
  }

  SplashScreen.hideAsync().catch(() => {});

  return (
    <View style={{flex: 1, backgroundColor: theme.BG_COLOR}}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </View>
  );
}

export default function RootLayout() {
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    const setup = async () => {
      await initDB();
      
      if (Notifications) {
        try {
          const { status: existingStatus } = await Notifications.getPermissionsAsync();
          if (existingStatus !== 'granted') {
            await Notifications.requestPermissionsAsync();
          }
        } catch (e) {
          console.log('Failed to request notification permissions', e);
        }
      }
      
      setDbReady(true);
    };
    setup();
  }, []);

  if (!dbReady) return null;

  return (
    <SettingsProvider>
      <RootContent />
    </SettingsProvider>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  splashLogoRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  splashText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 52,
    letterSpacing: -1,
  },
  splashTagline: {
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    letterSpacing: 0.2,
  },
});
