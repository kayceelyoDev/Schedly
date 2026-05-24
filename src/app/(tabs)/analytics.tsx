import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, Alert, Dimensions, KeyboardAvoidingView, Platform, ActivityIndicator, RefreshControl } from 'react-native';
import { useState, useCallback } from 'react';
import { getDB } from '../../db/database';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useFocusEffect } from 'expo-router';
import { LineChart } from 'react-native-gifted-charts';
import { Flame, Activity, Clock, DollarSign, PlusCircle, X, Trash2, CalendarDays, TrendingUp, BarChart2, ShoppingBag, CheckSquare, Square } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSettings, ThemeColors } from '../../context/SettingsContext';

const { width } = Dimensions.get('window');

export default function AnalyticsScreen() {
  const [activeTab, setActiveTab] = useState<'tasks' | 'earnings'>('tasks');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Tasks States
  const [bestHour, setBestHour] = useState<number | null>(null);
  const [avgViews, setAvgViews] = useState<number>(0);
  const [viewsTimeframe, setViewsTimeframe] = useState<'today' | 'week' | 'month'>('week');
  const [viewsChartData, setViewsChartData] = useState<any[]>([]);
  const [trendingProducts, setTrendingProducts] = useState<any[]>([]);

  // Earnings States
  const [earningsTimeframe, setEarningsTimeframe] = useState<'week' | 'month' | 'year'>('month');
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [totalRevenue, setTotalRevenue] = useState<number>(0);
  const [averages, setAverages] = useState<any>({});
  const [withdrawalChartData, setWithdrawalChartData] = useState<any[]>([]);

  // Selection state
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [wAmount, setWAmount] = useState('');
  const [wDate, setWDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const { theme, currency, timeFormat, isDark } = useSettings();
  const styles = createStyles(theme, isDark);
  const currSymbol = currency === 'USD' ? '$' : '₱';

  const fetchAnalytics = async () => {
    try {
      const db = await getDB();
      const now = new Date();

      // ==========================================
      // TASKS ANALYTICS
      // ==========================================
      const bestHourRow = await db.getAllAsync(`
        SELECT postHour, AVG(viewCount) as avgViews 
        FROM posts WHERE status = 'Analyzed' 
        GROUP BY postHour ORDER BY avgViews DESC LIMIT 1
      `) as any[];
      
      if (bestHourRow.length > 0 && bestHourRow[0].postHour !== null) {
        setBestHour(bestHourRow[0].postHour);
        setAvgViews(Math.round(bestHourRow[0].avgViews));
      } else {
        setBestHour(null);
      }

      const products = await db.getAllAsync(`
        SELECT affiliateLink, SUM(viewCount) as totalViews 
        FROM posts 
        WHERE status = 'Analyzed' AND affiliateLink IS NOT NULL AND affiliateLink != '' 
        GROUP BY affiliateLink ORDER BY totalViews DESC LIMIT 5
      `) as any[];
      setTrendingProducts(products);

      const analyzedPosts = await db.getAllAsync(`SELECT triggerTime, viewCount FROM posts WHERE status = 'Analyzed'`) as any[];
      const todayStr = now.toLocaleDateString();
      let chartMap = new Map<string, number>();

      if (viewsTimeframe === 'today') {
        for(let i=0; i<24; i++) chartMap.set(`${i}:00`, 0);
        analyzedPosts.forEach(p => {
          const d = new Date(p.triggerTime);
          if (d.toLocaleDateString() === todayStr) {
             const h = `${d.getHours()}:00`;
             chartMap.set(h, chartMap.get(h)! + p.viewCount);
          }
        });
      } else if (viewsTimeframe === 'week') {
        for(let i=6; i>=0; i--) {
           const d = new Date();
           d.setDate(d.getDate() - i);
           chartMap.set(d.toLocaleDateString([], {weekday: 'short'}), 0);
        }
        analyzedPosts.forEach(p => {
          const d = new Date(p.triggerTime);
          const diffDays = (now.getTime() - d.getTime()) / (1000*3600*24);
          if (diffDays <= 7 && diffDays >= 0) {
            const day = d.toLocaleDateString([], {weekday: 'short'});
            if (chartMap.has(day)) chartMap.set(day, chartMap.get(day)! + p.viewCount);
          }
        });
      } else if (viewsTimeframe === 'month') {
        for(let i=29; i>=0; i--) {
           const d = new Date();
           d.setDate(d.getDate() - i);
           chartMap.set(d.toLocaleDateString([], {month:'short', day:'numeric'}), 0);
        }
        analyzedPosts.forEach(p => {
          const d = new Date(p.triggerTime);
          const diffDays = (now.getTime() - d.getTime()) / (1000*3600*24);
          if (diffDays <= 30 && diffDays >= 0) {
            const day = d.toLocaleDateString([], {month:'short', day:'numeric'});
            if (chartMap.has(day)) chartMap.set(day, chartMap.get(day)! + p.viewCount);
          }
        });
      }

      const formattedViews = Array.from(chartMap.entries()).map(([label, value]) => {
        return { 
          value, 
          label, 
          dataPointText: value > 0 ? value.toString() : '' 
        };
      });
      setViewsChartData(formattedViews);


      // ==========================================
      // EARNINGS ANALYTICS
      // ==========================================
      const rows = await db.getAllAsync(`SELECT * FROM withdrawals ORDER BY date DESC`) as any[];
      setWithdrawals(rows);

      if (rows.length > 0) {
        const total = rows.reduce((sum: number, w: any) => sum + w.amount, 0);
        setTotalRevenue(total);

        const rowsAsc = [...rows].reverse();
        const firstDate = new Date(rowsAsc[0].date);
        let daysPassed = Math.ceil((now.getTime() - firstDate.getTime()) / (1000 * 3600 * 24));
        if (daysPassed < 1) daysPassed = 1;
        const avgPerDay = total / daysPassed;
        
        setAverages({
          day: avgPerDay, week: avgPerDay * 7, halfMonth: avgPerDay * 15,
          month: avgPerDay * 30, quarter: avgPerDay * 90, year: avgPerDay * 365,
        });

        // Timeframe filtering for the Revenue Chart
        let eChartMap = new Map<string, number>();

        if (earningsTimeframe === 'week') {
          for(let i=6; i>=0; i--) {
             const d = new Date();
             d.setDate(d.getDate() - i);
             eChartMap.set(d.toLocaleDateString([], {weekday: 'short'}), 0);
          }
          rows.forEach(w => {
            const d = new Date(w.date);
            const diffDays = (now.getTime() - d.getTime()) / (1000*3600*24);
            if (diffDays <= 7 && diffDays >= 0) {
              const day = d.toLocaleDateString([], {weekday: 'short'});
              if (eChartMap.has(day)) eChartMap.set(day, eChartMap.get(day)! + w.amount);
            }
          });
        } else if (earningsTimeframe === 'month') {
          for(let i=29; i>=0; i--) {
             const d = new Date();
             d.setDate(d.getDate() - i);
             eChartMap.set(d.toLocaleDateString([], {month:'short', day:'numeric'}), 0);
          }
          rows.forEach(w => {
            const d = new Date(w.date);
            const diffDays = (now.getTime() - d.getTime()) / (1000*3600*24);
            if (diffDays <= 30 && diffDays >= 0) {
              const day = d.toLocaleDateString([], {month:'short', day:'numeric'});
              if (eChartMap.has(day)) eChartMap.set(day, eChartMap.get(day)! + w.amount);
            }
          });
        } else if (earningsTimeframe === 'year') {
          for(let i=11; i>=0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            eChartMap.set(d.toLocaleDateString([], {month: 'short'}), 0);
          }
          rows.forEach(w => {
            const d = new Date(w.date);
            const monthDiff = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
            if (monthDiff <= 11 && monthDiff >= 0) {
              const m = d.toLocaleDateString([], {month: 'short'});
              if (eChartMap.has(m)) eChartMap.set(m, eChartMap.get(m)! + w.amount);
            }
          });
        }

        const formattedEarnings = Array.from(eChartMap.entries()).map(([label, value]) => {
          return { 
            value, 
            label, 
            dataPointText: value > 0 ? currSymbol + Math.round(value).toString() : '' 
          };
        });

        setWithdrawalChartData(formattedEarnings);
      } else {
        setTotalRevenue(0);
        setAverages({});
        setWithdrawalChartData([]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchAnalytics();
  };

  useFocusEffect(useCallback(() => { fetchAnalytics(); }, [viewsTimeframe, earningsTimeframe]));

  const formatHour = (hour: number) =>
    new Date(0, 0, 0, hour).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const timeOptions: Intl.DateTimeFormatOptions = timeFormat === '24h'
      ? { hour: '2-digit', minute: '2-digit', hour12: false }
      : { hour: 'numeric', minute: '2-digit', hour12: true };
    return {
      date: d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }),
      time: d.toLocaleTimeString([], timeOptions),
    };
  };

  const handleSaveWithdrawal = async () => {
    const amount = parseFloat(wAmount);
    if (isNaN(amount) || amount <= 0) return;
    try {
      const db = await getDB();
      await db.runAsync(`INSERT INTO withdrawals (amount, date) VALUES (?, ?)`, [amount, wDate.toISOString()]);
      setShowModal(false);
      setWAmount('');
      setWDate(new Date());
      fetchAnalytics();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteWithdrawal = (id: number) => {
    Alert.alert(
      'Delete Withdrawal',
      'Are you sure you want to delete this record?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            try {
              const db = await getDB();
              await db.runAsync(`DELETE FROM withdrawals WHERE id = ?`, [id]);
              fetchAnalytics();
            } catch (e) { console.error(e); }
          }
        }
      ]
    );
  };

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
    if (selectedIds.size === withdrawals.length) {
      setSelectedIds(new Set());
      setIsSelectionMode(false);
    } else {
      setSelectedIds(new Set(withdrawals.map((w: any) => w.id)));
    }
  };

  const handleBatchDelete = () => {
    if (selectedIds.size === 0) return;
    Alert.alert(
      'Delete Withdrawals',
      `Delete ${selectedIds.size} record(s)? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            try {
              const db = await getDB();
              const ids = Array.from(selectedIds).join(',');
              await db.runAsync(`DELETE FROM withdrawals WHERE id IN (${ids})`);
              setIsSelectionMode(false);
              setSelectedIds(new Set());
              fetchAnalytics();
            } catch (e) { console.error(e); }
          }
        }
      ]
    );
  };

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 150 }}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={theme.BRAND} />}
    >
      {/* Segmented Control */}
      <View style={styles.tabSwitcher}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'tasks' && { backgroundColor: theme.BRAND }]}
          onPress={() => setActiveTab('tasks')}
          activeOpacity={0.8}
        >
          <BarChart2 size={16} color={activeTab === 'tasks' ? '#fff' : theme.TEXT_MUTED} />
          <Text style={[styles.tabBtnText, activeTab === 'tasks' && { color: '#fff' }]}>
            Tasks
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'earnings' && { backgroundColor: theme.BRAND }]}
          onPress={() => setActiveTab('earnings')}
          activeOpacity={0.8}
        >
          <DollarSign size={16} color={activeTab === 'earnings' ? '#fff' : theme.TEXT_MUTED} />
          <Text style={[styles.tabBtnText, activeTab === 'earnings' && { color: '#fff' }]}>
            Earnings
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={{ paddingVertical: 60, alignItems: 'center' }}>
          <ActivityIndicator size="large" color={theme.BRAND} />
        </View>
      ) : activeTab === 'tasks' ? (
        <Animated.View entering={FadeIn.duration(400)} key="tasks">
          
          {/* Views Chart */}
          <Animated.View entering={FadeInDown.duration(600)} style={styles.card}>
            <View style={styles.cardHeaderFlex}>
              <Text style={styles.title}>Views Timeline</Text>
              <View style={styles.timeframeRow}>
                {['today', 'week', 'month'].map(t => (
                  <TouchableOpacity 
                    key={t} 
                    onPress={() => setViewsTimeframe(t as any)} 
                    style={[styles.timeframeBtn, viewsTimeframe === t && { backgroundColor: theme.BRAND }]}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.timeframeBtnText, viewsTimeframe === t && { color: '#FFFFFF' }]}>
                       {t.charAt(0).toUpperCase() + t.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {viewsChartData.length > 0 ? (
              <View style={styles.chartWrapper}>
                <LineChart
                  data={viewsChartData}
                  color={theme.BRAND}
                  thickness={3}
                  dataPointsColor={theme.BRAND}
                  dataPointsRadius={4}
                  textColor={theme.BRAND}
                  textFontSize={10}
                  textShiftY={-12}
                  textShiftX={-4}
                  areaChart
                  startFillColor={theme.BRAND}
                  startOpacity={0.25}
                  endFillColor={theme.BRAND}
                  endOpacity={0.0}
                  yAxisTextStyle={{ color: theme.TEXT_MUTED, fontFamily: 'Inter_500Medium', fontSize: 10 }}
                  xAxisLabelTextStyle={{ color: theme.TEXT_MUTED, fontFamily: 'Inter_500Medium', fontSize: 10 }}
                  yAxisThickness={0}
                  xAxisThickness={1}
                  xAxisColor={theme.BORDER}
                  hideRules
                  initialSpacing={20}
                  spacing={48}
                  noOfSections={4}
                  scrollToEnd
                  curved
                  width={width - 110}
                  height={160}
                />
              </View>
            ) : (
              <Text style={styles.emptyText}>No views recorded in this timeframe.</Text>
            )}
          </Animated.View>

          {/* Optimal Time Sweet Spot */}
          <Animated.View entering={FadeInDown.delay(100).duration(600)} style={styles.card}>
            <View style={styles.headerRow}>
              <Flame color="#F97316" size={24} />
              <Text style={styles.title}>Your Sweet Spot</Text>
            </View>
            {bestHour !== null ? (
              <View>
                <Text style={styles.mainStat}>{formatHour(bestHour)}</Text>
                <View style={[styles.subStatRow, { backgroundColor: '#F973161A' }]}>
                  <Activity color="#F97316" size={14} />
                  <Text style={[styles.subStat, { color: '#F97316' }]}>Peak performance ({avgViews} avg views)</Text>
                </View>
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Clock color={theme.TEXT_MUTED} size={32} />
                <Text style={styles.emptyText}>Save view counts to discover your best hour.</Text>
              </View>
            )}
          </Animated.View>

          {/* Trending Products */}
          <Animated.View entering={FadeInDown.delay(200).duration(600)} style={styles.card}>
            <View style={styles.headerRow}>
              <TrendingUp color={theme.BRAND} size={22} />
              <Text style={styles.title}>Trending Products</Text>
            </View>
            
            {trendingProducts.length > 0 ? (
              trendingProducts.map((p, index) => (
                <View key={p.affiliateLink} style={[styles.productRow, index < trendingProducts.length - 1 && styles.borderBottom]}>
                  <View style={styles.productLeft}>
                    <View style={[styles.productIconWrap, {backgroundColor: theme.BG_COLOR}]}>
                      <ShoppingBag size={14} color={theme.BRAND} />
                    </View>
                    <Text style={styles.productName} numberOfLines={1}>{p.affiliateLink}</Text>
                  </View>
                  <View style={styles.productRight}>
                     <Text style={styles.productViews}>{p.totalViews}</Text>
                     <Text style={styles.productViewsLabel}>Views</Text>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>No product performance data yet.</Text>
            )}
          </Animated.View>
        </Animated.View>
      ) : (
        <Animated.View entering={FadeIn.duration(400)} key="earnings">
          
          <View style={styles.headerFlex}>
            <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)}>
              <PlusCircle color="#fff" size={16} />
              <Text style={styles.addBtnText}>Log Withdrawal</Text>
            </TouchableOpacity>
          </View>

          {/* Total Earnings */}
          <Animated.View entering={FadeInDown.duration(600)} style={styles.card}>
            <View style={styles.headerRow}>
              <DollarSign color={theme.BRAND} size={24} />
              <Text style={styles.title}>Revenue Overview</Text>
            </View>
            <Text style={styles.mainStat}>{currSymbol}{totalRevenue.toFixed(2)}</Text>

            {Object.keys(averages).length > 0 && (
              <View style={styles.averagesGrid}>
                {[
                  { label: 'Per Day', value: averages.day },
                  { label: 'Per Week', value: averages.week },
                  { label: 'Half Month', value: averages.halfMonth },
                  { label: 'Per Month', value: averages.month },
                  { label: 'Quarterly', value: averages.quarter },
                  { label: 'Yearly', value: averages.year },
                ].map((item) => (
                  <View key={item.label} style={styles.avgBox}>
                    <Text style={styles.avgLabel}>{item.label}</Text>
                    <Text style={[styles.avgValue, { color: theme.BRAND }]}>{currSymbol}{item.value.toFixed(2)}</Text>
                  </View>
                ))}
              </View>
            )}
          </Animated.View>

          {/* Withdrawal Chart */}
          <Animated.View entering={FadeInDown.delay(100).duration(800)} style={styles.card}>
            <View style={styles.cardHeaderFlex}>
              <Text style={styles.title}>Revenue Trend</Text>
              <View style={styles.timeframeRow}>
                {['week', 'month', 'year'].map(t => (
                  <TouchableOpacity 
                    key={t} 
                    onPress={() => setEarningsTimeframe(t as any)} 
                    style={[styles.timeframeBtn, earningsTimeframe === t && { backgroundColor: theme.BRAND }]}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.timeframeBtnText, earningsTimeframe === t && { color: '#FFFFFF' }]}>
                       {t.charAt(0).toUpperCase() + t.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {withdrawalChartData.length > 0 ? (
              <View style={styles.chartWrapper}>
                <LineChart
                  data={withdrawalChartData}
                  color={theme.BRAND}
                  thickness={3}
                  dataPointsColor={theme.BRAND}
                  dataPointsRadius={4}
                  textColor={theme.BRAND}
                  textFontSize={10}
                  textShiftY={-12}
                  textShiftX={-4}
                  areaChart
                  startFillColor={theme.BRAND}
                  startOpacity={0.25}
                  endFillColor={theme.BRAND}
                  endOpacity={0.0}
                  yAxisTextStyle={{ color: theme.TEXT_MUTED, fontFamily: 'Inter_500Medium', fontSize: 10 }}
                  xAxisLabelTextStyle={{ color: theme.TEXT_MUTED, fontFamily: 'Inter_500Medium', fontSize: 10 }}
                  yAxisThickness={0}
                  xAxisThickness={1}
                  xAxisColor={theme.BORDER}
                  hideRules
                  initialSpacing={20}
                  spacing={48}
                  noOfSections={4}
                  scrollToEnd
                  curved
                  width={width - 110}
                  height={160}
                />
              </View>
            ) : (
              <Text style={styles.emptyText}>No revenue recorded in this timeframe.</Text>
            )}
          </Animated.View>

          {/* Withdrawal History List */}
          <Animated.View entering={FadeInDown.delay(150).duration(600)} style={styles.card}>
            {isSelectionMode ? (
              <View style={[styles.headerRow, { justifyContent: 'space-between' }]}>
                <TouchableOpacity onPress={toggleSelectAll} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  {selectedIds.size === withdrawals.length && withdrawals.length > 0 ? (
                    <CheckSquare color={theme.BRAND} size={20} />
                  ) : (
                    <Square color={theme.TEXT_MUTED} size={20} />
                  )}
                  <Text style={styles.title}>Select All</Text>
                </TouchableOpacity>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <TouchableOpacity onPress={() => setIsSelectionMode(false)} style={styles.cancelBtn}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  {selectedIds.size > 0 && (
                    <TouchableOpacity onPress={handleBatchDelete} style={styles.batchDeleteBtn}>
                      <Trash2 color="#fff" size={14} />
                      <Text style={styles.batchDeleteBtnText}>Delete</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ) : (
              <View style={styles.headerRow}>
                <CalendarDays color={theme.BRAND} size={22} />
                <Text style={styles.title}>Withdrawal History</Text>
              </View>
            )}

            {withdrawals.length === 0 ? (
              <View style={styles.emptyContainer}>
                <TrendingUp color={theme.BORDER} size={36} />
                <Text style={styles.emptyText}>No withdrawals recorded yet.</Text>
              </View>
            ) : (
              withdrawals.map((w: any, index: number) => {
                const { date, time } = formatDate(w.date);
                return (
                  <TouchableOpacity 
                    key={w.id} 
                    style={[styles.withdrawalRow, index < withdrawals.length - 1 && styles.borderBottom]}
                    activeOpacity={isSelectionMode ? 0.8 : 1}
                    onLongPress={() => handleLongPress(w.id)}
                    onPress={() => {
                       if (isSelectionMode) handlePressCard(w.id);
                    }}
                  >
                    {isSelectionMode && (
                      <View style={{ justifyContent: 'center', paddingRight: 12 }}>
                        {selectedIds.has(w.id) ? (
                          <CheckSquare color={theme.BRAND} size={20} />
                        ) : (
                          <Square color={theme.TEXT_MUTED} size={20} />
                        )}
                      </View>
                    )}
                    <View style={styles.withdrawalLeft}>
                      <View style={[styles.productIconWrap, { backgroundColor: theme.BRAND + '1A' }]}>
                        <DollarSign size={16} color={theme.BRAND} />
                      </View>
                      <View>
                        <Text style={styles.withdrawalAmount}>{currSymbol}{w.amount.toFixed(2)}</Text>
                        <Text style={styles.withdrawalDate}>{date} · {time}</Text>
                      </View>
                    </View>
                    {!isSelectionMode && (
                      <TouchableOpacity onPress={() => handleDeleteWithdrawal(w.id)} style={styles.deleteBtn} activeOpacity={0.7}>
                        <Trash2 size={16} color={theme.RED} />
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>
                );
              })
            )}
          </Animated.View>
        </Animated.View>
      )}

      {/* Add Withdrawal Modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <KeyboardAvoidingView 
          style={styles.modalOverlay}
          behavior="padding"
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Log Withdrawal</Text>
              <TouchableOpacity onPress={() => { setShowModal(false); setWAmount(''); setWDate(new Date()); }}>
                <X color={theme.TEXT_DARK} size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 50 }}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Amount ({currSymbol})</Text>
                <TextInput
                  style={styles.input}
                  value={wAmount}
                  onChangeText={setWAmount}
                  keyboardType="numeric"
                  placeholder="e.g. 500"
                  placeholderTextColor={theme.TEXT_MUTED}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Date</Text>
                <TouchableOpacity style={styles.dateInput} onPress={() => setShowDatePicker(true)}>
                  <CalendarDays size={16} color={theme.TEXT_MUTED} />
                  <Text style={styles.dateText}>{wDate.toLocaleDateString()}</Text>
                </TouchableOpacity>
              </View>

              {showDatePicker && (
                <DateTimePicker
                  value={wDate} mode="date" display="default"
                  onChange={(e, d) => { setShowDatePicker(false); if (d) setWDate(d); }}
                />
              )}

              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveWithdrawal} activeOpacity={0.8}>
                <Text style={styles.saveBtnText}>Save Withdrawal</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
}

const createStyles = (theme: ThemeColors, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.BG_COLOR, paddingHorizontal: 20, paddingTop: 10 },
  tabSwitcher: {
    flexDirection: 'row', backgroundColor: theme.CARD_BG, borderRadius: 20, padding: 6,
    borderWidth: 1, borderColor: theme.BORDER, marginBottom: 20,
  },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 14, gap: 8 },
  tabBtnText: { fontFamily: 'Inter_700Bold', fontSize: 14, color: theme.TEXT_MUTED },
  headerFlex: { marginBottom: 16 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.BRAND,
    paddingVertical: 14, borderRadius: 20, gap: 8, width: '100%',
  },
  addBtnText: { fontFamily: 'Inter_700Bold', color: '#fff', fontSize: 15 },
  card: {
    backgroundColor: theme.CARD_BG, borderRadius: 24, padding: 22,
    shadowColor: isDark ? '#000' : '#18181B', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.3 : 0.04, shadowRadius: 12, elevation: 3,
    marginBottom: 20, borderWidth: 1, borderColor: theme.BORDER,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18, gap: 10 },
  cardHeaderFlex: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  timeframeRow: { flexDirection: 'row', backgroundColor: theme.BG_COLOR, borderRadius: 16, padding: 4 },
  timeframeBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  timeframeBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 11, color: theme.TEXT_MUTED },
  title: { fontSize: 18, fontFamily: 'Inter_700Bold', color: theme.TEXT_DARK },
  mainStat: { fontSize: 34, fontFamily: 'Inter_700Bold', color: theme.TEXT_DARK, marginBottom: 12, letterSpacing: -1 },
  averagesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderColor: theme.BORDER },
  avgBox: {
    width: '30%', backgroundColor: theme.BG_COLOR, padding: 12,
    borderRadius: 16, borderWidth: 1, borderColor: theme.BORDER, alignItems: 'center',
  },
  avgLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 10, color: theme.TEXT_MUTED, marginBottom: 4, textAlign: 'center' },
  avgValue: { fontFamily: 'Inter_700Bold', fontSize: 13 },
  subStatRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, alignSelf: 'flex-start',
  },
  subStat: { fontSize: 12, fontFamily: 'Inter_700Bold' },
  emptyContainer: { alignItems: 'center', paddingVertical: 20, gap: 10 },
  emptyText: { fontSize: 14, fontFamily: 'Inter_500Medium', color: theme.TEXT_MUTED, textAlign: 'center' },
  chartWrapper: { alignItems: 'center', marginLeft: -10 },
  // Product & Withdrawal Rows
  productRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 },
  borderBottom: { borderBottomWidth: 1, borderBottomColor: theme.BORDER },
  productLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  productIconWrap: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  productName: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: theme.TEXT_DARK, flex: 1 },
  productRight: { alignItems: 'flex-end' },
  productViews: { fontFamily: 'Inter_700Bold', fontSize: 15, color: theme.TEXT_DARK },
  productViewsLabel: { fontFamily: 'Inter_500Medium', fontSize: 10, color: theme.TEXT_MUTED, marginTop: 2 },
  withdrawalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 },
  withdrawalLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  withdrawalAmount: { fontFamily: 'Inter_700Bold', fontSize: 16, color: theme.TEXT_DARK },
  withdrawalDate: { fontFamily: 'Inter_500Medium', fontSize: 12, color: theme.TEXT_MUTED, marginTop: 2 },
  deleteBtn: { padding: 8 },
  cancelBtn: { paddingHorizontal: 12, paddingVertical: 6 },
  cancelBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: theme.TEXT_MUTED },
  batchDeleteBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.RED, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  batchDeleteBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#fff' },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: theme.CARD_BG, borderTopLeftRadius: 32, borderTopRightRadius: 32,
    padding: 24, paddingBottom: 40, borderTopWidth: 1, borderColor: theme.BORDER,
  },
  modalHandle: { width: 40, height: 4, backgroundColor: theme.BORDER, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontFamily: 'Inter_700Bold', fontSize: 20, color: theme.TEXT_DARK },
  inputGroup: { marginBottom: 18 },
  inputLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: theme.TEXT_MUTED, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    backgroundColor: theme.BG_COLOR, borderRadius: 16, padding: 16,
    fontFamily: 'Inter_600SemiBold', fontSize: 16, color: theme.TEXT_DARK,
    borderWidth: 1, borderColor: theme.BORDER,
  },
  dateInput: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: theme.BG_COLOR, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: theme.BORDER,
  },
  dateText: { fontFamily: 'Inter_600SemiBold', fontSize: 16, color: theme.TEXT_DARK },
  saveBtn: { backgroundColor: theme.BRAND, borderRadius: 16, padding: 18, alignItems: 'center', marginTop: 8 },
  saveBtnText: { fontFamily: 'Inter_700Bold', fontSize: 16, color: '#fff' },
});
