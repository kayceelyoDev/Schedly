import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Modal, TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useCallback, useState } from 'react';
import { getDB } from '../../db/database';
import Animated, { FadeInDown, FadeInUp, Layout, FadeIn } from 'react-native-reanimated';
import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import { useFocusEffect } from 'expo-router';
import {
  Play, CalendarDays, BarChart2, CheckCircle2, Clock3,
  Flame, TrendingUp, DollarSign, Star, Zap, Award,
  ShoppingBag, Pencil, Trash2, X, CalendarClock, Hash, Type, Save,
} from 'lucide-react-native';
import { Calendar } from 'react-native-calendars';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSettings, ThemeColors } from '../../context/SettingsContext';
import { CheckSquare, Square } from 'lucide-react-native';

// ─── Smart Insights Card ────────────────────────────────────────────────────

interface InsightsData { streak: number; postsThisWeek: number; totalEarnings: number; }

function getInsight(data: InsightsData, theme: ThemeColors, currencySymbol: string) {
  const { streak, postsThisWeek, totalEarnings } = data;
  if (totalEarnings > 500) return { Icon: DollarSign, iconColor: theme.GREEN, headline: 'Strong earner!', body: `You've pulled in ${currencySymbol}${totalEarnings.toFixed(0)} in total withdrawals. Your consistency is paying off.` };
  if (streak >= 7) return { Icon: Flame, iconColor: '#F97316', headline: `${streak}-day streak!`, body: "You've been posting every day this week. Consistency drives the algorithm — keep it up." };
  if (postsThisWeek >= 5) return { Icon: Zap, iconColor: '#FBBF24', headline: 'High volume week', body: `${postsThisWeek} posts this week. You're giving the algorithm a lot to work with.` };
  if (postsThisWeek >= 3) return { Icon: TrendingUp, iconColor: theme.BRAND, headline: 'Building momentum', body: `${postsThisWeek} posts this week. Try to hit one more daily post to push your reach.` };
  if (postsThisWeek === 0) return { Icon: Star, iconColor: theme.TEXT_MUTED, headline: 'Start your week strong', body: 'No posts scheduled yet this week. Even one post keeps your profile active for the algorithm.' };
  return { Icon: Award, iconColor: theme.BRAND, headline: 'Stay consistent', body: 'Regular posting, even 2–3 times a week, compounds into serious affiliate income over time.' };
}

function InsightsCard({ theme, isDark }: { theme: ThemeColors; isDark: boolean }) {
  const [data, setData] = useState<InsightsData>({ streak: 0, postsThisWeek: 0, totalEarnings: 0 });
  const { notificationsEnabled, currency } = useSettings();
  const currencySymbol = currency === 'PHP' ? '₱' : '$';

  useFocusEffect(useCallback(() => {
    const load = async () => {
      try {
        const db = await getDB();
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        weekStart.setHours(0, 0, 0, 0);
        const weekPosts = await db.getAllAsync(
          `SELECT COUNT(*) as cnt FROM posts WHERE status IN ('Posted','Analyzed') AND triggerTime >= ?`,
          [weekStart.toISOString()]
        ) as any[];
        const postsThisWeek = weekPosts[0]?.cnt ?? 0;

        const days = await db.getAllAsync(
          `SELECT DATE(triggerTime) as d FROM posts WHERE status IN ('Posted','Analyzed') GROUP BY DATE(triggerTime) ORDER BY d DESC`
        ) as any[];
        let streak = 0;
        const today = new Date();
        for (let i = 0; i < days.length; i++) {
          const expected = new Date(today);
          expected.setDate(today.getDate() - i);
          const expectedStr = expected.toISOString().split('T')[0];
          if (days[i].d === expectedStr) streak++;
          else break;
        }

        const earningsRows = await db.getAllAsync(`SELECT SUM(amount) as total FROM withdrawals`) as any[];
        const totalEarnings = earningsRows[0]?.total ?? 0;
        setData({ streak, postsThisWeek, totalEarnings });

        // Schedule random engagement analytics notification if enabled
        // Only attempt in a real build — expo-notifications was stripped from Expo Go in SDK 53
        const isExpoGo = require('expo-constants').default.appOwnership === 'expo';
        let Notifications: any = null;
        if (!isExpoGo) {
          try { Notifications = require('expo-notifications'); } catch (e) { /* not available */ }
        }

        if (notificationsEnabled && Notifications) {
          const lastNotifRows = await db.getAllAsync(`SELECT value FROM settings WHERE key = 'lastAnalyticsNotif'`) as any[];
          const lastNotifDate = lastNotifRows[0]?.value ? new Date(lastNotifRows[0].value).getTime() : 0;
          
          // Only trigger once every 5 days to avoid spam
          if (Date.now() - lastNotifDate > 5 * 24 * 60 * 60 * 1000) {
            let title = "Quick Update!";
            let body = "Schedule your posts today to build your streak and reach on TikTok!";
            
            if (totalEarnings > 0 && Math.random() > 0.5) {
              title = "Earnings Update 💰";
              body = `You've made ${currencySymbol}${totalEarnings.toFixed(0)} so far! Schedule more posts to keep growing.`;
            } else if (streak >= 3) {
              title = "Incredible Streak! 🔥";
              body = `You are on a ${streak}-day posting streak! Don't lose your momentum today.`;
            } else if (postsThisWeek >= 2) {
              title = "Algorithm Boost 🚀";
              body = `You've posted ${postsThisWeek} times this week! The algorithm loves consistency.`;
            }

            // Schedule for a random time between 1 and 3 days from now
            const daysFromNow = Math.floor(Math.random() * 3) + 1;
            const triggerTime = new Date();
            triggerTime.setDate(triggerTime.getDate() + daysFromNow);
            triggerTime.setHours(Math.floor(Math.random() * 8) + 10, 0, 0, 0); // 10 AM to 6 PM

            await Notifications.scheduleNotificationAsync({
              content: { title, body, sound: true, data: { screen: 'index' } },
              trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DATE,
                date: triggerTime,
                channelId: 'default',
              },
            });

            await db.runAsync(`INSERT OR REPLACE INTO settings (key, value) VALUES ('lastAnalyticsNotif', ?)`, [new Date().toISOString()]);
          }
        }
      } catch (e) { console.error(e); }
    };
    load();
  }, [notificationsEnabled]));

  const iStyles = insightStyles(theme, isDark);
  const insight = getInsight(data, theme, currencySymbol);
  const { Icon, iconColor, headline, body } = insight;

  return (
    <Animated.View entering={FadeInDown.delay(120).springify()} style={iStyles.insightCard}>
      <View style={iStyles.statsRow}>
        <View style={iStyles.statChip}>
          <Flame size={14} color="#F97316" />
          <Text style={iStyles.statValue}>{data.streak}</Text>
          <Text style={iStyles.statLabel}>Streak</Text>
        </View>
        <View style={iStyles.statDivider} />
        <View style={iStyles.statChip}>
          <BarChart2 size={14} color={theme.BRAND} />
          <Text style={iStyles.statValue}>{data.postsThisWeek}</Text>
          <Text style={iStyles.statLabel}>This Week</Text>
        </View>
        <View style={iStyles.statDivider} />
        <View style={iStyles.statChip}>
          <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 16, color: theme.GREEN, marginBottom: -2 }}>{currencySymbol}</Text>
          <Text style={[iStyles.statValue, { color: theme.GREEN }]}>
            {data.totalEarnings > 0 ? data.totalEarnings.toFixed(0) : '—'}
          </Text>
          <Text style={iStyles.statLabel}>Earned</Text>
        </View>
      </View>
      <View style={iStyles.quoteRow}>
        <View style={[iStyles.quoteIconWrap, { backgroundColor: iconColor + '22' }]}>
          <Icon size={20} color={iconColor} />
        </View>
        <View style={iStyles.quoteText}>
          <Text style={iStyles.quoteHeadline}>{headline}</Text>
          <Text style={iStyles.quoteBody}>{body}</Text>
        </View>
      </View>
    </Animated.View>
  );
}

const insightStyles = (theme: ThemeColors, isDark: boolean) => StyleSheet.create({
  insightCard: {
    backgroundColor: theme.CARD_BG, borderRadius: 24, marginHorizontal: 16, marginBottom: 12,
    padding: 18, borderWidth: 1, borderColor: theme.BORDER,
    shadowColor: isDark ? '#000' : '#18181B', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.3 : 0.04, shadowRadius: 12, elevation: 3, gap: 16,
  },
  statsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  statChip: { flex: 1, alignItems: 'center', gap: 3 },
  statDivider: { width: 1, height: 36, backgroundColor: theme.BORDER },
  statValue: { fontFamily: 'Inter_700Bold', fontSize: 20, color: theme.TEXT_DARK, lineHeight: 24 },
  statLabel: { fontFamily: 'Inter_500Medium', fontSize: 11, color: theme.TEXT_MUTED, textTransform: 'uppercase', letterSpacing: 0.5 },
  quoteRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingTop: 14, borderTopWidth: 1, borderTopColor: theme.BORDER },
  quoteIconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  quoteText: { flex: 1, gap: 3 },
  quoteHeadline: { fontFamily: 'Inter_700Bold', fontSize: 14, color: theme.TEXT_DARK },
  quoteBody: { fontFamily: 'Inter_500Medium', fontSize: 13, color: theme.TEXT_MUTED, lineHeight: 19 },
});

// ─── Main Dashboard Screen ──────────────────────────────────────────────────

export default function DashboardScreen() {
  const [posts, setPosts] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewCounts, setViewCounts] = useState<{ [key: number]: string }>({});
  const [calendarMarks, setCalendarMarks] = useState<any>({});

  // Selection mode
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Edit modal
  const [editingPost, setEditingPost] = useState<any>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCaption, setEditCaption] = useState('');
  const [editProduct, setEditProduct] = useState('');
  const [editDate, setEditDate] = useState(new Date());
  const [showEditDatePicker, setShowEditDatePicker] = useState(false);
  const [showEditTimePicker, setShowEditTimePicker] = useState(false);

  const { theme, timeFormat, isDark } = useSettings();
  const styles = createStyles(theme, isDark);

  const fetchPosts = async (dateStr: string) => {
    try {
      const db = await getDB();
      const allRows = await db.getAllAsync(
        `SELECT * FROM posts WHERE status IN ('Scheduled', 'Posted', 'Analyzed') AND triggerTime LIKE ? ORDER BY CASE status WHEN 'Scheduled' THEN 0 WHEN 'Posted' THEN 1 WHEN 'Analyzed' THEN 2 ELSE 3 END ASC, triggerTime DESC`,
        [`${dateStr}%`]
      );
      setPosts(allRows);

      // Fetch all tasks to mark the calendar
      const allTasks = await db.getAllAsync(
        `SELECT triggerTime, status FROM posts WHERE status IN ('Scheduled', 'Posted', 'Analyzed')`
      ) as any[];
      
      const marks: any = {};
      allTasks.forEach((task: any) => {
        const dStr = task.triggerTime.split('T')[0];
        if (!marks[dStr]) marks[dStr] = { hasScheduled: false, hasCompleted: false };
        if (task.status === 'Scheduled') marks[dStr].hasScheduled = true;
        else marks[dStr].hasCompleted = true;
      });
      
      const formattedMarks: any = {};
      Object.keys(marks).forEach(d => {
        formattedMarks[d] = { 
          marked: true, 
          dotColor: marks[d].hasScheduled ? theme.BRAND : theme.GREEN 
        };
      });
      setCalendarMarks(formattedMarks);
    } catch (e) { console.error(e); } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchPosts(selectedDate); }, [selectedDate]));

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchPosts(selectedDate);
  };

  const handlePostNow = async (post: any) => {
    try {
      await Clipboard.setStringAsync(post.caption || '');
      const db = await getDB();
      await db.runAsync(`UPDATE posts SET status = 'Posted' WHERE id = ?`, [post.id]);
      setPosts((prev: any) => prev.map((p: any) => p.id === post.id ? { ...p, status: 'Posted' } : p));
      const tikTokUrl = 'tiktok://';
      const canOpen = await Linking.canOpenURL(tikTokUrl);
      await Linking.openURL(canOpen ? tikTokUrl : 'https://www.tiktok.com/');
    } catch (e) { console.error('Failed to post', e); }
  };

  const handleAnalyze = async (post: any) => {
    const views = parseInt(viewCounts[post.id] || '0', 10);
    if (isNaN(views)) return;
    try {
      const db = await getDB();
      await db.runAsync(`UPDATE posts SET status = 'Analyzed', viewCount = ? WHERE id = ?`, [views, post.id]);
      setPosts((prev: any) => prev.filter((p: any) => p.id !== post.id));
    } catch (e) { console.error('Failed to analyze', e); }
  };

  const openEditModal = (post: any) => {
    setEditingPost(post);
    setEditTitle(post.title);
    setEditCaption(post.caption || '');
    setEditProduct(post.affiliateLink || '');
    setEditDate(new Date(post.triggerTime));
  };

  const closeEditModal = () => {
    setEditingPost(null);
    setEditTitle(''); setEditCaption(''); setEditProduct('');
  };

  const handleUpdatePost = async () => {
    if (!editTitle.trim() || !editingPost) return;
    try {
      const db = await getDB();
      await db.runAsync(
        `UPDATE posts SET title = ?, caption = ?, affiliateLink = ?, triggerTime = ?, postHour = ? WHERE id = ?`,
        [editTitle.trim(), editCaption.trim(), editProduct.trim(), editDate.toISOString(), editDate.getHours(), editingPost.id]
      );
      closeEditModal();
      fetchPosts(selectedDate);
    } catch (e) { console.error(e); }
  };

  const handleDeletePost = (post: any) => {
    Alert.alert(
      'Delete Task',
      `Delete "${post.title}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            try {
              const db = await getDB();
              await db.runAsync(`DELETE FROM posts WHERE id = ?`, [post.id]);
              fetchPosts(selectedDate);
            } catch (e) { console.error(e); }
          }
        }
      ]
    );
  };

  const timeOptions: Intl.DateTimeFormatOptions = timeFormat === '24h'
    ? { hour: '2-digit', minute: '2-digit', hour12: false }
    : { hour: 'numeric', minute: '2-digit', hour12: true };

  const handleLongPress = (id: number) => {
    if (!isSelectionMode) {
      setIsSelectionMode(true);
      setSelectedIds(new Set([id]));
    }
  };

  const handlePressCard = (id: number) => {
    if (isSelectionMode) {
      const next = new Set(selectedIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      setSelectedIds(next);
      if (next.size === 0) setIsSelectionMode(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === posts.length) {
      setSelectedIds(new Set());
      setIsSelectionMode(false);
    } else {
      setSelectedIds(new Set(posts.map((p: any) => p.id)));
    }
  };

  const handleBatchDelete = () => {
    if (selectedIds.size === 0) return;
    Alert.alert(
      'Delete Tasks',
      `Delete ${selectedIds.size} task(s)? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            try {
              const db = await getDB();
              const ids = Array.from(selectedIds).join(',');
              await db.runAsync(`DELETE FROM posts WHERE id IN (${ids})`);
              setIsSelectionMode(false);
              setSelectedIds(new Set());
              fetchPosts(selectedDate);
            } catch (e) { console.error(e); }
          }
        }
      ]
    );
  };

  const renderItem = ({ item, index }: any) => {
    const isPosted = item.status === 'Posted';
    const isAnalyzed = item.status === 'Analyzed';
    const isCompleted = isPosted || isAnalyzed;

    return (
      <Animated.View
        entering={FadeInDown.delay(index * 100).springify().damping(18)}
        layout={Layout.springify().damping(14)}
        style={{ marginBottom: 14 }}
      >
        <View style={[styles.card, { marginBottom: 0, opacity: isAnalyzed ? 0.65 : 1 }]}>
          <TouchableOpacity
            activeOpacity={isSelectionMode ? 0.8 : 1}
            onLongPress={() => handleLongPress(item.id)}
            onPress={() => handlePressCard(item.id)}
            style={{ flex: 1, flexDirection: 'row' }}
          >
          {isSelectionMode && (
            <View style={{ justifyContent: 'center', paddingLeft: 16 }}>
              {selectedIds.has(item.id) ? (
                <CheckSquare color={theme.BRAND} size={20} />
              ) : (
                <Square color={theme.TEXT_MUTED} size={20} />
              )}
            </View>
          )}
          <View style={[styles.cardAccent, { backgroundColor: isCompleted ? theme.GREEN : theme.BRAND, marginLeft: isSelectionMode ? 10 : 14 }]} />
          <View style={styles.cardInner}>
            {/* Top row: status + time + action icons */}
          <View style={styles.cardTopRow}>
            <View style={styles.cardTopLeft}>
              <View style={[styles.statusDot, { backgroundColor: isCompleted ? theme.GREEN : theme.BRAND }]} />
              <Text style={[styles.statusLabel, { color: isCompleted ? theme.GREEN : theme.BRAND }]}>
                {isAnalyzed ? 'Analyzed' : (isPosted ? 'Completed' : 'Scheduled')}
              </Text>
            </View>
            <View style={styles.cardTopRight}>
              <View style={styles.timePill}>
                <Clock3 size={11} color={theme.TEXT_MUTED} />
                <Text style={styles.timePillText}>
                  {new Date(item.triggerTime).toLocaleTimeString([], timeOptions)}
                </Text>
              </View>
              {/* Edit & Delete buttons */}
              <TouchableOpacity
                style={[styles.iconBtn, { backgroundColor: theme.BRAND + '18' }]}
                onPress={() => openEditModal(item)}
                activeOpacity={0.7}
              >
                <Pencil size={13} color={theme.BRAND} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.iconBtn, { backgroundColor: theme.RED + '18' }]}
                onPress={() => handleDeletePost(item)}
                activeOpacity={0.7}
              >
                <Trash2 size={13} color={theme.RED} />
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>

          {item.affiliateLink ? (
            <View style={styles.productRow}>
              <ShoppingBag size={12} color={theme.TEXT_MUTED} />
              <Text style={styles.cardProduct} numberOfLines={1}>{item.affiliateLink}</Text>
            </View>
          ) : null}

          <View style={styles.cardActions}>
            {item.status === 'Scheduled' && (
              <TouchableOpacity onPress={() => handlePostNow(item)} activeOpacity={0.8} style={styles.postBtn}>
                <Play color="#fff" size={14} fill="#fff" />
                <Text style={styles.postBtnText}>Post Now</Text>
              </TouchableOpacity>
            )}
            {item.status === 'Posted' && (
              <View style={styles.viewsRow}>
                <View style={styles.viewsInputWrap}>
                  <BarChart2 color={theme.TEXT_MUTED} size={14} />
                  <TextInput
                    style={styles.viewsInput}
                    placeholder="Enter view count"
                    placeholderTextColor={theme.TEXT_MUTED}
                    keyboardType="numeric"
                    value={viewCounts[item.id] || ''}
                    onChangeText={(val) => setViewCounts(prev => ({ ...prev, [item.id]: val }))}
                  />
                </View>
                <TouchableOpacity style={styles.saveViewsBtn} onPress={() => handleAnalyze(item)}>
                  <CheckCircle2 size={16} color="#fff" />
                  <Text style={styles.saveViewsBtnText}>Save</Text>
                </TouchableOpacity>
              </View>
            )}
            {item.status === 'Analyzed' && (
              <View style={[styles.viewsRow, { paddingVertical: 8, gap: 6 }]}>
                 <BarChart2 color={theme.GREEN} size={15} />
                 <Text style={{ fontFamily: 'Inter_700Bold', color: theme.GREEN, fontSize: 13 }}>
                   {item.viewCount} Views Tracked
                 </Text>
              </View>
            )}
          </View>
        </View>
        </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'padding'} 
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 80}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 150 }}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={theme.BRAND} />}
        keyboardShouldPersistTaps="handled"
      >
        {/* Sticky Calendar */}
        <View style={styles.calendarSection}>
          <Animated.View entering={FadeInDown.delay(50).springify()} style={styles.calendarWrapper}>
            <Calendar
              key={`${theme.BRAND}-${isDark}`}
              current={selectedDate}
              onDayPress={(day: any) => setSelectedDate(day.dateString)}
              theme={{
                backgroundColor: 'transparent', calendarBackground: 'transparent',
                textSectionTitleColor: isDark ? '#8A8A9A' : '#8A8FA8',
                dayTextColor: isDark ? '#F0F0F4' : '#18181B',
                textDisabledColor: isDark ? '#3A3A4A' : '#C8C8C0',
                monthTextColor: isDark ? '#F0F0F4' : '#18181B',
                arrowColor: isDark ? '#F0F0F4' : '#18181B',
                selectedDayBackgroundColor: theme.BRAND,
                selectedDayTextColor: '#FFFFFF',
                todayTextColor: theme.BRAND,
                todayBackgroundColor: theme.BRAND + '22',
                textDayFontFamily: 'Inter_500Medium',
                textMonthFontFamily: 'Inter_700Bold',
                textDayHeaderFontFamily: 'Inter_600SemiBold',
                textDayFontSize: 14, textMonthFontSize: 16, textDayHeaderFontSize: 12,
              }}
              markedDates={{ 
                ...calendarMarks,
                [selectedDate]: { 
                  ...(calendarMarks[selectedDate] || {}),
                  selected: true, 
                  selectedColor: theme.BRAND, 
                  disableTouchEvent: true 
                } 
              }}
            />
          </Animated.View>
        </View>

        {/* Smart Insights */}
        <InsightsCard theme={theme} isDark={isDark} />

        {/* Task List */}
        <View style={styles.listSection}>
          <View style={styles.listHeader}>
            {isSelectionMode ? (
              <>
                <TouchableOpacity onPress={toggleSelectAll} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  {selectedIds.size === posts.length && posts.length > 0 ? (
                    <CheckSquare color={theme.BRAND} size={20} />
                  ) : (
                    <Square color={theme.TEXT_MUTED} size={20} />
                  )}
                  <Text style={styles.listTitle}>Select All</Text>
                </TouchableOpacity>
                <View style={{ flex: 1 }} />
                <TouchableOpacity onPress={() => setIsSelectionMode(false)} style={styles.cancelBtn}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                {selectedIds.size > 0 && (
                  <TouchableOpacity onPress={handleBatchDelete} style={styles.batchDeleteBtn}>
                    <Trash2 color="#fff" size={14} />
                    <Text style={styles.batchDeleteBtnText}>Delete</Text>
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <>
                <Text style={styles.listTitle}>Task List</Text>
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{posts.length}</Text>
                </View>
              </>
            )}
          </View>

          {isLoading ? (
            <View style={{ paddingVertical: 40, alignItems: 'center' }}>
              <ActivityIndicator size="large" color={theme.BRAND} />
            </View>
          ) : posts.length === 0 ? (
            <Animated.View entering={FadeInUp.delay(100)} style={styles.emptyContainer}>
              <CalendarDays color={theme.BORDER} size={56} />
              <Text style={styles.emptyTitle}>All clear!</Text>
              <Text style={styles.emptyText}>No tasks scheduled for this day.</Text>
            </Animated.View>
          ) : (
            posts.map((item: any, index: number) => (
              <View key={item.id.toString()}>
                {renderItem({ item, index })}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Edit Task Modal */}
      <Modal visible={!!editingPost} transparent animationType="slide">
        <KeyboardAvoidingView 
          style={styles.modalOverlay}
          behavior="padding"
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Task</Text>
              <TouchableOpacity onPress={closeEditModal}>
                <X color={theme.TEXT_DARK} size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView 
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 150 }}
            >
              {/* Task Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Task Name</Text>
                <View style={styles.inputRow}>
                  <Type color={theme.TEXT_MUTED} size={16} />
                  <TextInput
                    style={styles.modalInput}
                    value={editTitle}
                    onChangeText={setEditTitle}
                    placeholder="Task name"
                    placeholderTextColor={theme.TEXT_MUTED}
                  />
                </View>
              </View>

              {/* Date & Time */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Date & Time</Text>
                <View style={styles.dateTimeRow}>
                  <TouchableOpacity style={styles.datePill} onPress={() => setShowEditDatePicker(true)}>
                    <CalendarClock size={14} color={theme.TEXT_MUTED} />
                    <Text style={styles.datePillText}>{editDate.toLocaleDateString()}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.datePill} onPress={() => setShowEditTimePicker(true)}>
                    <Clock3 size={14} color={theme.TEXT_MUTED} />
                    <Text style={styles.datePillText}>{editDate.toLocaleTimeString([], timeOptions)}</Text>
                  </TouchableOpacity>
                </View>
                {showEditDatePicker && (
                  <DateTimePicker value={editDate} mode="date" display="default"
                    onChange={(e, d) => { setShowEditDatePicker(false); if (d) setEditDate(d); }} />
                )}
                {showEditTimePicker && (
                  <DateTimePicker value={editDate} mode="time" display="default"
                    onChange={(e, d) => { setShowEditTimePicker(false); if (d) setEditDate(d); }} />
                )}
              </View>

              {/* Product */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Product Name</Text>
                <View style={styles.inputRow}>
                  <ShoppingBag color={theme.TEXT_MUTED} size={16} />
                  <TextInput
                    style={styles.modalInput}
                    value={editProduct}
                    onChangeText={setEditProduct}
                    placeholder="e.g. Wireless Mouse"
                    placeholderTextColor={theme.TEXT_MUTED}
                  />
                </View>
              </View>

              {/* Caption */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Caption</Text>
                <View style={[styles.inputRow, { alignItems: 'flex-start', paddingTop: 4 }]}>
                  <Hash color={theme.TEXT_MUTED} size={16} style={{ marginTop: 12 }} />
                  <TextInput
                    style={[styles.modalInput, styles.textArea]}
                    value={editCaption}
                    onChangeText={setEditCaption}
                    placeholder="Caption..."
                    placeholderTextColor={theme.TEXT_MUTED}
                    multiline
                  />
                </View>
              </View>

              <TouchableOpacity style={styles.saveBtn} onPress={handleUpdatePost}>
                <Save color="#fff" size={18} />
                <Text style={styles.saveBtnText}>Update Task</Text>
              </TouchableOpacity>
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const createStyles = (theme: ThemeColors, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.BG_COLOR },
  calendarSection: { backgroundColor: theme.BG_COLOR, paddingTop: 16 },
  calendarWrapper: {
    backgroundColor: theme.CARD_BG, borderRadius: 28, marginHorizontal: 16, marginBottom: 20,
    paddingVertical: 12, paddingHorizontal: 12,
    shadowColor: isDark ? '#000' : '#18181B', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDark ? 0.4 : 0.06, shadowRadius: 20, elevation: 4,
    borderWidth: 1, borderColor: theme.BORDER,
  },
  listSection: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 20 },
  listHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  listTitle: { fontFamily: 'Inter_700Bold', fontSize: 20, color: theme.TEXT_DARK },
  countBadge: { backgroundColor: theme.BRAND + '22', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  countBadgeText: { fontFamily: 'Inter_700Bold', fontSize: 13, color: theme.BRAND },
  cancelBtn: { paddingHorizontal: 12, paddingVertical: 6 },
  cancelBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: theme.TEXT_MUTED },
  batchDeleteBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.RED, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  batchDeleteBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#fff' },
  // Card
  card: {
    flexDirection: 'row', backgroundColor: theme.CARD_BG, borderRadius: 24, marginBottom: 14,
    overflow: 'hidden', shadowColor: isDark ? '#000' : '#18181B',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: isDark ? 0.35 : 0.05,
    shadowRadius: 12, elevation: 3, borderWidth: 1, borderColor: theme.BORDER,
  },
  cardAccent: { width: 4, borderRadius: 4, margin: 14, marginRight: 0, minHeight: 80 },
  cardInner: { flex: 1, padding: 14 },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cardTopLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardTopRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusLabel: { fontFamily: 'Inter_700Bold', fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase' },
  timePill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: theme.BG_COLOR, paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 20, borderWidth: 1, borderColor: theme.BORDER,
  },
  timePillText: { fontFamily: 'Inter_600SemiBold', fontSize: 11, color: theme.TEXT_MUTED },
  iconBtn: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontFamily: 'Inter_700Bold', fontSize: 16, color: theme.TEXT_DARK, marginBottom: 6, lineHeight: 22 },
  productRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 12 },
  cardProduct: { fontFamily: 'Inter_500Medium', fontSize: 12, color: theme.TEXT_MUTED, flexShrink: 1 },
  cardActions: { marginTop: 4 },
  postBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.BRAND,
    alignSelf: 'flex-start', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20,
  },
  postBtnText: { fontFamily: 'Inter_700Bold', color: '#fff', fontSize: 13 },
  viewsRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
  viewsInputWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: theme.BG_COLOR, borderRadius: 16, borderWidth: 1, borderColor: theme.BORDER,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  viewsInput: { flex: 1, fontFamily: 'Inter_600SemiBold', fontSize: 13, color: theme.TEXT_DARK },
  saveViewsBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: theme.GREEN,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16,
  },
  saveViewsBtnText: { fontFamily: 'Inter_700Bold', color: '#fff', fontSize: 13 },
  // Empty
  emptyContainer: { alignItems: 'center', paddingVertical: 48, gap: 8 },
  emptyTitle: { fontFamily: 'Inter_700Bold', fontSize: 20, color: theme.TEXT_DARK, marginTop: 8 },
  emptyText: { fontFamily: 'Inter_500Medium', color: theme.TEXT_MUTED, fontSize: 15, textAlign: 'center' },
  // Edit Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: theme.CARD_BG, borderTopLeftRadius: 32, borderTopRightRadius: 32,
    paddingHorizontal: 24, paddingTop: 12, paddingBottom: 0,
    maxHeight: '90%', borderTopWidth: 1, borderColor: theme.BORDER,
  },
  modalHandle: { width: 40, height: 4, backgroundColor: theme.BORDER, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontFamily: 'Inter_700Bold', fontSize: 20, color: theme.TEXT_DARK },
  inputGroup: { marginBottom: 16 },
  inputLabel: {
    fontFamily: 'Inter_600SemiBold', fontSize: 11, color: theme.TEXT_MUTED,
    marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: theme.BG_COLOR, borderRadius: 16, borderWidth: 1, borderColor: theme.BORDER,
    paddingHorizontal: 14,
  },
  modalInput: { flex: 1, fontFamily: 'Inter_600SemiBold', fontSize: 15, color: theme.TEXT_DARK, paddingVertical: 14 },
  textArea: { height: 100, textAlignVertical: 'top', paddingVertical: 10 },
  dateTimeRow: { flexDirection: 'row', gap: 10 },
  datePill: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: theme.BG_COLOR, borderRadius: 16, borderWidth: 1, borderColor: theme.BORDER,
    paddingHorizontal: 14, paddingVertical: 14,
  },
  datePillText: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: theme.TEXT_DARK },
  saveBtn: {
    flexDirection: 'row', backgroundColor: theme.BRAND, borderRadius: 16,
    paddingVertical: 16, justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 4,
  },
  saveBtnText: { fontFamily: 'Inter_700Bold', color: '#ffffff', fontSize: 15 },
});
