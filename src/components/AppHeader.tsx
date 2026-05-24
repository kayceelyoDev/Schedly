import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Settings } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSettings } from '../context/SettingsContext';

const PAGE_LABELS: Record<string, string> = {
  '/':          'Monitor',
  '/add':       'Create Task',
  '/vault':     'Caption Vault',
  '/analytics': 'Performance',
  '/settings':  'Settings',
};

export default function AppHeader() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const { theme, isDark } = useSettings();

  const pageLabel = PAGE_LABELS[pathname] ?? 'Monitor';
  const isSettingsPage = pathname === '/settings';

  return (
    <View
      style={[
        styles.wrapper,
        {
          paddingTop: insets.top + 8,
          backgroundColor: theme.BG_COLOR,
          borderBottomColor: theme.BORDER,
        },
      ]}
    >
      <View style={styles.topRow}>

        {/* Image logo + Native text for better legibility */}
        <View style={styles.logoRow}>
          <Image 
            source={require('../../assets/images/logo-only-with-out-bg.png')} 
            style={{ width: 34, height: 34, resizeMode: 'contain', marginRight: 8, tintColor: isDark ? '#FFFFFF' : theme.TEXT_DARK }}
          />
          <Text style={[styles.logo, { color: theme.TEXT_DARK }]}>SCHED</Text>
          <Text style={[styles.logo, { color: theme.BRAND }]}>LY</Text>
        </View>

        {/* Settings button — only visible when NOT on the settings page */}
        {!isSettingsPage && (
          <TouchableOpacity
            style={[
              styles.settingsBtn,
              { backgroundColor: isDark ? '#2A2A35' : '#EBEBEA' },
            ]}
            onPress={() => router.push('/settings')}
            activeOpacity={0.75}
          >
            <Settings size={18} color={theme.TEXT_MUTED} strokeWidth={1.8} />
          </TouchableOpacity>
        )}
      </View>

      {/* Page subtitle */}
      <Text style={[styles.pageLabel, { color: theme.TEXT_MUTED }]}>
        {pageLabel}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // Same font family, weight & letter-spacing as the splash screen text
  logo: {
    fontFamily: 'Inter_700Bold',
    fontSize: 30,
    letterSpacing: -1,
  },
  settingsBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    letterSpacing: 0.2,
  },
});
