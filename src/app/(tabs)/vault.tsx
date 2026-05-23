import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Modal, Alert } from 'react-native';
import { useState, useCallback } from 'react';
import { getDB } from '../../db/database';
import { ShoppingBag, Hash, Save, Trash2, Pencil, X, PlusCircle } from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp, Layout, Easing } from 'react-native-reanimated';
import { useFocusEffect } from 'expo-router';
import { useSettings, ThemeColors } from '../../context/SettingsContext';

export default function VaultScreen() {
  const [vaultItems, setVaultItems] = useState<any[]>([]);

  // Add/Edit modal state
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null); // null = new, else = editing
  const [productName, setProductName] = useState('');
  const [hashtags, setHashtags] = useState('');

  const { theme } = useSettings();
  const styles = createStyles(theme);

  const fetchVault = async () => {
    try {
      const db = await getDB();
      const items = await db.getAllAsync('SELECT * FROM vault ORDER BY id DESC');
      setVaultItems(items);
    } catch (e) {
      console.error(e);
    }
  };

  useFocusEffect(useCallback(() => { fetchVault(); }, []));

  const openAddModal = () => {
    setEditingItem(null);
    setProductName('');
    setHashtags('');
    setShowModal(true);
  };

  const openEditModal = (item: any) => {
    setEditingItem(item);
    setProductName(item.productName);
    setHashtags(item.hashtags);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingItem(null);
    setProductName('');
    setHashtags('');
  };

  const handleSave = async () => {
    if (!productName.trim() || !hashtags.trim()) return;
    try {
      const db = await getDB();
      if (editingItem) {
        await db.runAsync(
          `UPDATE vault SET productName = ?, hashtags = ? WHERE id = ?`,
          [productName.trim(), hashtags.trim(), editingItem.id]
        );
      } else {
        await db.runAsync(
          `INSERT OR REPLACE INTO vault (productName, hashtags) VALUES (?, ?)`,
          [productName.trim(), hashtags.trim()]
        );
      }
      closeModal();
      fetchVault();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const handleDelete = (id: number, name: string) => {
    Alert.alert(
      'Delete Entry',
      `Remove "${name}" from your vault?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            try {
              const db = await getDB();
              await db.runAsync(`DELETE FROM vault WHERE id = ?`, [id]);
              fetchVault();
            } catch (e) { console.error(e); }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Hashtag Vault</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openAddModal} activeOpacity={0.8}>
          <PlusCircle color="#fff" size={18} />
          <Text style={styles.addBtnText}>Add Entry</Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
        {vaultItems.length === 0 ? (
          <Animated.View entering={FadeInUp} style={styles.emptyContainer}>
            <Hash size={48} color={theme.BORDER} />
            <Text style={styles.emptyTitle}>Vault is empty</Text>
            <Text style={styles.emptyText}>Tap "Add Entry" to save a product and its hashtags.</Text>
          </Animated.View>
        ) : (
          vaultItems.map((item: any, index: number) => (
            <Animated.View
              key={item.id.toString()}
              entering={FadeInUp.delay(index * 80).easing(Easing.out(Easing.exp))}
              layout={Layout.springify().damping(14)}
              style={styles.card}
            >
              {/* Left accent */}
              <View style={[styles.cardAccent, { backgroundColor: theme.BRAND }]} />

              <View style={styles.cardInner}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardTitleRow}>
                    <ShoppingBag color={theme.BRAND} size={15} />
                    <Text style={styles.cardTitle}>{item.productName}</Text>
                  </View>
                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      onPress={() => openEditModal(item)}
                      activeOpacity={0.7}
                      style={[styles.actionBtn, { backgroundColor: theme.BRAND + '18' }]}
                    >
                      <Pencil color={theme.BRAND} size={15} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDelete(item.id, item.productName)}
                      activeOpacity={0.7}
                      style={[styles.actionBtn, { backgroundColor: theme.RED + '18' }]}
                    >
                      <Trash2 color={theme.RED} size={15} />
                    </TouchableOpacity>
                  </View>
                </View>
                <Text style={styles.hashtagsText}>{item.hashtags}</Text>
              </View>
            </Animated.View>
          ))
        )}
      </ScrollView>

      {/* Add / Edit Modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingItem ? 'Edit Entry' : 'New Vault Entry'}</Text>
              <TouchableOpacity onPress={closeModal}>
                <X color={theme.TEXT_DARK} size={24} />
              </TouchableOpacity>
            </View>

            {/* Product Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Product Name</Text>
              <View style={styles.inputWrapper}>
                <ShoppingBag color={theme.TEXT_MUTED} size={16} />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Wireless Mouse"
                  placeholderTextColor={theme.TEXT_MUTED}
                  value={productName}
                  onChangeText={setProductName}
                />
              </View>
            </View>

            {/* Hashtags */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Hashtags</Text>
              <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
                <Hash color={theme.TEXT_MUTED} size={16} style={{ marginTop: 4 }} />
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="#TikTokMadeMeBuyIt #Tech"
                  placeholderTextColor={theme.TEXT_MUTED}
                  value={hashtags}
                  onChangeText={setHashtags}
                  multiline
                />
              </View>
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.8}>
              <Save color="#fff" size={18} />
              <Text style={styles.saveBtnText}>{editingItem ? 'Update' : 'Save Hashtags'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (theme: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.BG_COLOR },
  pageHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16,
  },
  pageTitle: { fontFamily: 'Inter_700Bold', fontSize: 20, color: theme.TEXT_DARK },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: theme.BRAND, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20,
  },
  addBtnText: { fontFamily: 'Inter_700Bold', color: '#fff', fontSize: 13 },
  list: { paddingHorizontal: 16, paddingBottom: 150 },
  // Cards
  card: {
    flexDirection: 'row', backgroundColor: theme.CARD_BG,
    borderRadius: 20, marginBottom: 14, overflow: 'hidden',
    borderWidth: 1, borderColor: theme.BORDER,
  },
  cardAccent: { width: 4, margin: 12, marginRight: 0, borderRadius: 4, minHeight: 60 },
  cardInner: { flex: 1, padding: 14 },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 10,
  },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 7, flex: 1 },
  cardTitle: { fontFamily: 'Inter_700Bold', fontSize: 15, color: theme.TEXT_DARK, flexShrink: 1 },
  cardActions: { flexDirection: 'row', gap: 8 },
  actionBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  hashtagsText: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: theme.BRAND, lineHeight: 20 },
  // Empty
  emptyContainer: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyTitle: { fontFamily: 'Inter_700Bold', fontSize: 20, color: theme.TEXT_DARK },
  emptyText: { fontFamily: 'Inter_500Medium', fontSize: 14, color: theme.TEXT_MUTED, textAlign: 'center', paddingHorizontal: 24 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: theme.CARD_BG, borderTopLeftRadius: 32, borderTopRightRadius: 32,
    padding: 24, paddingBottom: 44, borderTopWidth: 1, borderColor: theme.BORDER,
  },
  modalHandle: { width: 40, height: 4, backgroundColor: theme.BORDER, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontFamily: 'Inter_700Bold', fontSize: 20, color: theme.TEXT_DARK },
  inputGroup: { marginBottom: 18 },
  inputLabel: {
    fontFamily: 'Inter_600SemiBold', fontSize: 11, color: theme.TEXT_MUTED,
    marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: theme.BG_COLOR, borderWidth: 1, borderColor: theme.BORDER,
    borderRadius: 16, paddingHorizontal: 14,
  },
  textAreaWrapper: { alignItems: 'flex-start', paddingVertical: 8 },
  input: { flex: 1, fontFamily: 'Inter_600SemiBold', fontSize: 15, color: theme.TEXT_DARK, paddingVertical: 14 },
  textArea: { height: 90, textAlignVertical: 'top', paddingVertical: 8 },
  saveBtn: {
    flexDirection: 'row', backgroundColor: theme.BRAND, borderRadius: 16,
    paddingVertical: 16, justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 4,
  },
  saveBtnText: { fontFamily: 'Inter_700Bold', color: '#ffffff', fontSize: 15 },
});
