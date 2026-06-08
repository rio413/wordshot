import { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Modal, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { Card } from '@/components/Card';
import { PillButton } from '@/components/PillButton';
import { FloatingLabelInput } from '@/components/FloatingLabelInput';
import { useAuth } from '@/lib/auth';
import { deleteFromBank, subscribeToBank } from '@/lib/db';
import { WordCard } from '@/lib/types';
import { palette, space } from '@/constants/theme';

function wordFontSize(word: string): number {
  const len = word.length;
  if (len <= 6)  return 48; // 6 CJK × 48px = 288px ✓
  if (len <= 9)  return 32; // 9 CJK × 32px = 288px ✓
  if (len <= 14) return 24;
  if (len <= 24) return 20;
  return 16;
}

export default function BankScreen() {
  const { user } = useAuth();
  const [words, setWords] = useState<WordCard[]>([]);
  const [query, setQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<WordCard | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToBank(user.uid, setWords, () => setLoadError(true));
    return unsub;
  }, [user]);

  const onDelete = () => {
    if (!user || !selected) return;
    Alert.alert(
      'Remove from bank',
      `Remove "${selected.word}" from your bank? This can't be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteFromBank(user.uid, selected.id);
              setSelected(null);
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  };

  const onRefresh = () => {
    if (!user) return;
    setRefreshing(true);
    setLoadError(false);
    const unsub = subscribeToBank(
      user.uid,
      (w) => { setWords(w); setRefreshing(false); },
      () => { setRefreshing(false); setLoadError(true); },
    );
    return unsub;
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return words;
    return words.filter(
      (w) =>
        w.word.toLowerCase().includes(q) ||
        w.fromUsername.toLowerCase().includes(q) ||
        (w.note ?? '').toLowerCase().includes(q),
    );
  }, [query, words]);

  return (
    <Screen tone="cream" padded={false}>
      <View style={styles.header}>
        <Text variant="h1">Word bank</Text>
        <Text variant="micro" style={{ marginTop: 4 }}>
          {words.length} {words.length === 1 ? 'word' : 'words'} saved
        </Text>
        {loadError ? (
          <Text variant="small" color={palette.red} style={{ marginTop: 4 }}>
            Couldn't load your bank. Pull down to retry.
          </Text>
        ) : null}
        <View style={{ marginTop: space.s3 }}>
          <FloatingLabelInput label="Search" value={query} onChangeText={setQuery} />
        </View>
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(w) => w.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => <WordRow word={item} onPress={() => setSelected(item)} />}
        ItemSeparatorComponent={() => <View style={{ height: space.s2 }} />}
        ListEmptyComponent={<EmptyState />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.greenAccent} />}
      />
      <Modal
        visible={!!selected}
        transparent
        animationType="fade"
        onRequestClose={() => setSelected(null)}
      >
        <Pressable style={styles.overlay} onPress={() => setSelected(null)}>
          <Pressable style={styles.detailCard} onPress={() => {}}>
            <View style={styles.detailTopRow}>
              <Text variant="uppercaseLabel" color={palette.textBlackSoft}>Saved word</Text>
              <Ionicons
                name="close"
                size={22}
                color={palette.textBlackSoft}
                onPress={() => setSelected(null)}
                suppressHighlighting
              />
            </View>
            {selected ? (
              <>
                <Text
                  variant="display"
                  color={palette.starbucksGreen}
                  align="center"
                  numberOfLines={2}
                  adjustsFontSizeToFit
                  style={{ marginTop: space.s4, fontSize: wordFontSize(selected.word) }}
                >
                  {selected.word}
                </Text>
                <View style={styles.detailFromRow}>
                  <Ionicons name="person-circle" size={16} color={palette.greenAccent} />
                  <Text variant="smallStrong" color={palette.greenAccent}>
                    @{selected.fromUsername}
                  </Text>
                </View>
                <Text variant="micro" color={palette.textBlackSoft} align="center" style={{ marginTop: space.s1 }}>
                  {new Date(selected.decidedAt ?? selected.createdAt).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric',
                  })}
                </Text>
                {selected.note ? (
                  <Text variant="bodyLarge" align="center" color={palette.textBlackSoft} style={{ marginTop: space.s4 }}>
                    {selected.note}
                  </Text>
                ) : null}
                <View style={{ marginTop: space.s5 }}>
                  <PillButton
                    label={deleting ? 'Removing…' : 'Remove from bank'}
                    variant="destructive"
                    loading={deleting}
                    fullWidth
                    onPress={onDelete}
                  />
                </View>
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

function WordRow({ word, onPress }: { word: WordCard; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      <Card style={styles.wordCard}>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text variant="bodyMedium">{word.word}</Text>
            {word.note ? (
              <Text variant="small" color={palette.textBlackSoft} style={{ marginTop: 4 }}>
                {word.note}
              </Text>
            ) : null}
            <View style={styles.metaRow}>
              <Ionicons name="person-circle-outline" size={14} color={palette.textBlackSoft} />
              <Text variant="micro">@{word.fromUsername}</Text>
            </View>
          </View>
          <View style={styles.rowRight}>
            <Ionicons name="bookmark" size={14} color={palette.gold} />
            <Ionicons name="chevron-forward" size={16} color={palette.textBlackSoft} />
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

function EmptyState() {
  return (
    <View style={styles.empty}>
      <Ionicons name="bookmark-outline" size={36} color={palette.textBlackSoft} style={{ alignSelf: 'center', marginBottom: space.s3 }} />
      <Text variant="bodyLarge" align="center" color={palette.textBlackSoft}>
        Your bank is empty.
      </Text>
      <Text variant="small" align="center" color={palette.textBlackSoft} style={{ marginTop: space.s2 }}>
        Swipe right on incoming shots to save words here.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: space.s3,
    paddingTop: space.s4,
    paddingBottom: space.s3,
  },
  list: {
    paddingHorizontal: space.s3,
    paddingBottom: space.s8,
  },
  wordCard: {
    paddingVertical: space.s3,
    paddingHorizontal: space.s3,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s3,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s2,
  },
  pressed: {
    opacity: 0.7,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  empty: {
    paddingTop: space.s9,
    paddingHorizontal: space.s4,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    paddingHorizontal: space.s4,
  },
  detailCard: {
    backgroundColor: palette.white,
    borderRadius: 16,
    padding: space.s4,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  detailTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailFromRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    marginTop: space.s3,
  },
});
