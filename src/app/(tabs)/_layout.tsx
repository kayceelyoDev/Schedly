import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSettings } from '../../context/SettingsContext';
import FloatingTabBar from '../../components/FloatingTabBar';
import AppHeader from '../../components/AppHeader';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { theme } = useSettings();

  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        // Disable the native expo-router header — we use our own AppHeader
        headerShown: true,
        header: () => <AppHeader />,
        // Reserve space for floating tab bar
        sceneStyle: {
          backgroundColor: theme.BG_COLOR,
          paddingBottom: 130 + insets.bottom,
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Monitor' }} />
      <Tabs.Screen name="add" options={{ title: 'Create Task' }} />
      <Tabs.Screen name="vault" options={{ title: 'Vault' }} />
      <Tabs.Screen name="analytics" options={{ title: 'Analytics' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}
