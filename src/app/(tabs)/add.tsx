import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Platform, KeyboardAvoidingView } from 'react-native';
import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { useRouter } from 'expo-router';
import { getDB } from '../../db/database';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Type, ShoppingBag, CalendarClock, Hash, CalendarDays, Clock } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSettings, ThemeColors } from '../../context/SettingsContext';
import Constants from 'expo-constants';

// Never load expo-notifications inside Expo Go — it was stripped in SDK 53+
const isExpoGo = Constants.appOwnership === 'expo';
let Notifications: any = null;
if (!isExpoGo) {
  try { Notifications = require('expo-notifications'); } catch (e) { /* not available */ }
}

export default function AddPostScreen() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [productName, setProductName] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [vaultItems, setVaultItems] = useState<any[]>([]);

  const { theme, timeFormat, notificationsEnabled } = useSettings();
  const styles = createStyles(theme);

  useFocusEffect(
    useCallback(() => {
      const fetchVault = async () => {
        try {
          const db = await getDB();
          const items = await db.getAllAsync('SELECT * FROM vault');
          setVaultItems(items);
        } catch (e) {
          console.error(e);
        }
      };
      fetchVault();
    }, [])
  );

  const handleProductBlur = () => {
    if (!productName) return;
    const match = vaultItems.find((v: any) => v.productName.toLowerCase() === productName.toLowerCase());
    if (match && match.hashtags) {
      if (!caption.includes(match.hashtags)) {
        setCaption((prev) => prev ? `${prev}\n\n${match.hashtags}` : match.hashtags);
      }
    }
  };

  const handleSave = async () => {
    if (!title) return;
    try {
      const db = await getDB();
      const postHour = date.getHours();
      
      await db.runAsync(
        `INSERT INTO posts (title, triggerTime, caption, affiliateLink, status, postHour, commissionRate) VALUES (?, ?, ?, ?, 'Scheduled', ?, 0)`,
        [title, date.toISOString(), caption, productName, postHour]
      );

      // PRODUCTION: Schedule 15-min warning + deadline notification
      if (notificationsEnabled && Notifications) {
        try {
          const now = new Date();
          const fifteenMinsBefore = new Date(date.getTime() - 15 * 60000);

          // 15-minute warning — only if deadline is more than 15 mins away
          if (fifteenMinsBefore > now) {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: `⏰ Upcoming: ${title}`,
                body: `Due in 15 minutes!${productName ? ` Product: ${productName}` : ''}`,
                sound: true,
                data: { screen: 'index', taskTitle: title },
              },
              trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DATE,
                date: fifteenMinsBefore,
                channelId: 'default',
              },
            });
          }

          // Exact deadline notification
          if (date > now) {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: `🚀 Time to Post: ${title}`,
                body: `Post right now!${productName ? ` Product: ${productName}.` : ''}${caption ? ` Check your caption.` : ''}`,
                sound: true,
                data: { screen: 'index', taskTitle: title },
              },
              trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DATE,
                date: date,
                channelId: 'default',
              },
            });
          }
        } catch (e) {
          console.log('Failed to schedule notification:', e);
        }
      }

      router.push('/');
    } catch (e) {
      console.error(e);
    }
  };

  const onChangeDate = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) setDate(selectedDate);
  };

  const onChangeTime = (event: any, selectedDate?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedDate) setDate(selectedDate);
  };

  const timeOptions: Intl.DateTimeFormatOptions = timeFormat === '24h' 
      ? { hour: '2-digit', minute: '2-digit', hour12: false } 
      : { hour: 'numeric', minute: '2-digit', hour12: true };

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior="padding"
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 80}
    >
      <ScrollView 
        style={styles.container} 
        contentContainerStyle={{ paddingBottom: 150 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View entering={FadeInDown.delay(100)} style={styles.formGroup}>
          <View style={styles.labelContainer}>
            <Type color={theme.BRAND} size={18} />
            <Text style={styles.label}>Task Name</Text>
          </View>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="What needs to be done?"
            placeholderTextColor={theme.TEXT_MUTED}
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200)} style={styles.formGroup}>
          <View style={styles.labelContainer}>
            <CalendarClock color={theme.BRAND} size={18} />
            <Text style={styles.label}>Scheduled Date & Time</Text>
          </View>
          <View style={styles.dateTimeContainer}>
            <TouchableOpacity style={styles.dateBtn} onPress={() => setShowDatePicker(true)} activeOpacity={0.7}>
              <CalendarDays size={16} color={theme.TEXT_MUTED} />
              <Text style={styles.dateText}>{date.toLocaleDateString()}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dateBtn} onPress={() => setShowTimePicker(true)} activeOpacity={0.7}>
              <Clock size={16} color={theme.TEXT_MUTED} />
              <Text style={styles.dateText}>{date.toLocaleTimeString([], timeOptions)}</Text>
            </TouchableOpacity>
          </View>
          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display="default"
              onChange={onChangeDate}
            />
          )}
          {showTimePicker && (
            <DateTimePicker
              value={date}
              mode="time"
              display="default"
              onChange={onChangeTime}
            />
          )}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300)} style={styles.formGroup}>
          <View style={styles.labelContainer}>
            <ShoppingBag color={theme.BRAND} size={18} />
            <Text style={styles.label}>Product Name</Text>
          </View>
          <TextInput
            style={styles.input}
            value={productName}
            onChangeText={setProductName}
            onBlur={handleProductBlur}
            placeholder="e.g. Wireless Mouse"
            placeholderTextColor={theme.TEXT_MUTED}
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(400)} style={styles.formGroup}>
          <View style={styles.labelContainer}>
            <Hash color={theme.BRAND} size={18} />
            <Text style={styles.label}>Caption</Text>
          </View>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={caption}
            onChangeText={setCaption}
            multiline
            placeholder="Enter caption..."
            placeholderTextColor={theme.TEXT_MUTED}
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(500)}>
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.8}>
             <Text style={styles.saveBtnText}>Save Task</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (theme: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.BG_COLOR,
    padding: 24,
  },
  formGroup: {
    marginBottom: 24,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  label: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: theme.TEXT_DARK,
  },
  input: {
    backgroundColor: theme.CARD_BG,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 18,
    color: theme.TEXT_DARK,
    borderWidth: 1,
    borderColor: theme.BORDER,
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  dateTimeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  dateBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    paddingHorizontal: 20,
    gap: 10,
    backgroundColor: theme.CARD_BG,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.BORDER,
  },
  dateText: {
    fontFamily: 'Inter_600SemiBold',
    color: theme.TEXT_DARK,
    fontSize: 15,
  },
  saveBtn: {
    marginTop: 10,
    marginBottom: 40,
    backgroundColor: theme.BRAND,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  saveBtnText: {
    fontFamily: 'Inter_700Bold',
    color: '#ffffff',
    fontSize: 16,
  },
});
