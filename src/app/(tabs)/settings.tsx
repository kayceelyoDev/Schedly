import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { useSettings, ThemeColors } from '../../context/SettingsContext';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Moon, Sun, Monitor, DollarSign, Bell, Clock, Palette } from 'lucide-react-native';

export default function SettingsScreen() {
  const { theme, themeMode, accentColor, currency, timeFormat, notificationsEnabled, updateSetting } = useSettings();
  const styles = createStyles(theme);

  const colors = ['#6B4EFF', '#3B82F6', '#10B981', '#EF4444', '#F59E0B', '#EC4899'];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      
      {/* Appearance */}
      <Animated.View entering={FadeInDown.duration(400)} style={styles.section}>
        <Text style={styles.sectionTitle}>Appearance</Text>
        <View style={styles.card}>
          <View style={styles.themeSelector}>
            <TouchableOpacity 
              style={[styles.themeOption, themeMode === 'light' && styles.themeOptionActive]}
              onPress={() => updateSetting('theme', 'light')}
            >
              <Sun color={themeMode === 'light' ? theme.BRAND : theme.TEXT_MUTED} size={24} />
              <Text style={[styles.themeOptionText, themeMode === 'light' && {color: theme.BRAND}]}>Light</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.themeOption, themeMode === 'dark' && styles.themeOptionActive]}
              onPress={() => updateSetting('theme', 'dark')}
            >
              <Moon color={themeMode === 'dark' ? theme.BRAND : theme.TEXT_MUTED} size={24} />
              <Text style={[styles.themeOptionText, themeMode === 'dark' && {color: theme.BRAND}]}>Dark</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.themeOption, themeMode === 'system' && styles.themeOptionActive]}
              onPress={() => updateSetting('theme', 'system')}
            >
              <Monitor color={themeMode === 'system' ? theme.BRAND : theme.TEXT_MUTED} size={24} />
              <Text style={[styles.themeOptionText, themeMode === 'system' && {color: theme.BRAND}]}>System</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>

      {/* Accent Color */}
      <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.section}>
        <Text style={styles.sectionTitle}>Accent Color</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.iconContainer}>
              <Palette color={theme.TEXT_MUTED} size={20} />
            </View>
            <View style={styles.colorPalette}>
              {colors.map((c) => (
                <TouchableOpacity 
                  key={c} 
                  style={[styles.colorCircle, { backgroundColor: c }, accentColor === c && styles.colorCircleActive]}
                  onPress={() => updateSetting('accentColor', c)}
                />
              ))}
            </View>
          </View>
        </View>
      </Animated.View>

      {/* Localization */}
      <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.section}>
        <Text style={styles.sectionTitle}>Localization</Text>
        <View style={styles.card}>
          <View style={[styles.row, styles.borderBottom]}>
            <View style={styles.iconContainer}>
              <DollarSign color={theme.TEXT_MUTED} size={20} />
            </View>
            <Text style={styles.rowText}>Currency</Text>
            <View style={styles.toggleGroup}>
              <TouchableOpacity 
                style={[styles.toggleBtn, currency === 'USD' && styles.toggleBtnActive]}
                onPress={() => updateSetting('currency', 'USD')}
              >
                <Text style={[styles.toggleBtnText, currency === 'USD' && {color: '#fff'}]}>USD ($)</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.toggleBtn, currency === 'PHP' && styles.toggleBtnActive]}
                onPress={() => updateSetting('currency', 'PHP')}
              >
                <Text style={[styles.toggleBtnText, currency === 'PHP' && {color: '#fff'}]}>PHP (₱)</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.row}>
            <View style={styles.iconContainer}>
              <Clock color={theme.TEXT_MUTED} size={20} />
            </View>
            <Text style={styles.rowText}>Time Format</Text>
            <View style={styles.toggleGroup}>
              <TouchableOpacity 
                style={[styles.toggleBtn, timeFormat === '12h' && styles.toggleBtnActive]}
                onPress={() => updateSetting('timeFormat', '12h')}
              >
                <Text style={[styles.toggleBtnText, timeFormat === '12h' && {color: '#fff'}]}>12h</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.toggleBtn, timeFormat === '24h' && styles.toggleBtnActive]}
                onPress={() => updateSetting('timeFormat', '24h')}
              >
                <Text style={[styles.toggleBtnText, timeFormat === '24h' && {color: '#fff'}]}>24h</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Animated.View>

      {/* Notifications */}
      <Animated.View entering={FadeInDown.delay(300).duration(400)} style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.iconContainer}>
              <Bell color={theme.TEXT_MUTED} size={20} />
            </View>
            <View style={{flex: 1}}>
              <Text style={styles.rowText}>Task Reminders</Text>
              <Text style={styles.rowSubtext}>Get notified 15 mins before a post</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={(val) => updateSetting('notificationsEnabled', val.toString())}
              trackColor={{ false: theme.BORDER, true: theme.BRAND }}
              thumbColor={'#fff'}
            />
          </View>
        </View>
      </Animated.View>
      
      <View style={{height: 100}} />
    </ScrollView>
  );
}

const createStyles = (theme: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.BG_COLOR,
    padding: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    color: theme.TEXT_MUTED,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: theme.CARD_BG,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.BORDER,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  borderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: theme.BORDER,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.BG_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  rowText: {
    flex: 1,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: theme.TEXT_DARK,
  },
  rowSubtext: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: theme.TEXT_MUTED,
    marginTop: 2,
  },
  themeSelector: {
    flexDirection: 'row',
    padding: 8,
  },
  themeOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
  },
  themeOptionActive: {
    backgroundColor: theme.BG_COLOR,
  },
  themeOptionText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: theme.TEXT_MUTED,
  },
  colorPalette: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  colorCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  colorCircleActive: {
    borderWidth: 3,
    borderColor: theme.TEXT_DARK,
  },
  toggleGroup: {
    flexDirection: 'row',
    backgroundColor: theme.BG_COLOR,
    borderRadius: 12,
    padding: 4,
  },
  toggleBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  toggleBtnActive: {
    backgroundColor: theme.BRAND,
  },
  toggleBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: theme.TEXT_MUTED,
  }
});
