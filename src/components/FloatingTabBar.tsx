import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CalendarClock, PlusCircle, Hash, BarChart2 } from 'lucide-react-native';
import { useSettings } from '../context/SettingsContext';

const TABS = [
  { name: 'index', Icon: CalendarClock },
  { name: 'add', Icon: PlusCircle },
  { name: 'vault', Icon: Hash },
  { name: 'analytics', Icon: BarChart2 },
];

interface Props {
  state: any;
  navigation: any;
}

export default function FloatingTabBar({ state, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useSettings();

  // Light mode: white pill with border; Dark mode: rich dark pill
  const pillBg = isDark ? '#1A1A1F' : '#FFFFFF';
  const pillBorder = isDark ? '#2A2A35' : '#E8E8E2';
  const pillShadow = isDark ? '#000000' : '#18181B';

  return (
    <View style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, 16) }]}>
      <View style={[
        styles.pill,
        {
          backgroundColor: pillBg,
          borderColor: pillBorder,
          shadowColor: pillShadow,
        }
      ]}>
        {TABS.map((tab, index) => {
          const isActive = state.index === index;
          const { Icon } = tab;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: state.routes[index]?.key,
              canPreventDefault: true,
            });
            if (!isActive && !event.defaultPrevented) {
              navigation.navigate({ name: state.routes[index]?.name, merge: true });
            }
          };

          return (
            <TouchableOpacity
              key={tab.name}
              onPress={onPress}
              activeOpacity={0.75}
              style={styles.tabItem}
            >
              <View style={[
                styles.iconContainer,
                isActive && { backgroundColor: theme.BRAND },
                !isActive && !isDark && { backgroundColor: '#F4F4F0' },
                !isActive && isDark && { backgroundColor: '#2A2A35' },
              ]}>
                <Icon
                  color={isActive ? '#FFFFFF' : theme.TEXT_MUTED}
                  size={22}
                  strokeWidth={isActive ? 2.5 : 1.8}
                />
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderRadius: 40,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 16,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  iconContainer: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
