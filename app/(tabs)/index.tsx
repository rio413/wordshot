/**
 * Send screen — the default tab. The single most important UI in the product.
 *
 * Goal: word leaves your phone in <10s.
 * Layout (Thumb-Zone): the input card and the Shoot button are anchored at the
 * bottom of the viewport so the typing surface and the trigger sit directly under
 * the user's thumb. Recipient selection lives above and scrolls if it grows.
 */
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { PillButton } from '@/components/PillButton';
import { Chip, ChipRow } from '@/components/Chip';
import { ShootableCard, ShootableCardHandle } from '@/components/ShootableCard';
import { FloatingLabelInput } from '@/components/FloatingLabelInput';
import { useAuth } from '@/lib/auth';
import {
  findFriendByUsername,
  getRecentRecipients,
  recordRecentRecipient,
  sendWord,
  sendWordToGroup,
  subscribeToGroups,
} from '@/lib/db';
import { Friend, Group, RecipientChoice } from '@/lib/types';
import { palette, radii, space, type } from '@/constants/theme';

export default function SendScreen() {
  const { user, profile } = useAuth();
  const params = useLocalSearchParams<{ word?: string; note?: string }>();
  const insets = useSafeAreaInsets();

  const [word, setWord] = useState(params.word ?? '');
  const [note, setNote] = useState(params.note ?? '');
  const [showNote, setShowNote] = useState(!!params.note);
  const [recents, setRecents] = useState<Friend[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [recipient, setRecipient] = useState<RecipientChoice | null>(null);
  const [usernameInput, setUsernameInput] = useState('');
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [showUsernamePicker, setShowUsernamePicker] = useState(false);
  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const sentToTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wordInputRef = useRef<TextInput>(null);
  const cardRef = useRef<ShootableCardHandle>(null);

  useEffect(() => {
    wordInputRef.current?.focus();
    if (user) getRecentRecipients(user.uid).then(setRecents).catch(() => {});
    const unsub = user ? subscribeToGroups(user.uid, setGroups) : undefined;
    return () => {
      if (sentToTimer.current) clearTimeout(sentToTimer.current);
      unsub?.();
    };
  }, [user]);

  const canShoot = !!word.trim() && !!recipient && !sending;

  const onShoot = () => {
    if (!user || !profile || !recipient) return;
    const wordSnap = word.trim();
    const noteSnap = note.trim() || undefined;
    const recipientSnap = recipient;
    if (!wordSnap) return;

    setWord('');
    setNote('');
    setShowNote(false);
    setSending(true);

    const sendPromise =
      recipientSnap.kind === 'friend'
        ? sendWord({
            word: wordSnap,
            note: noteSnap,
            from: { uid: user.uid, username: profile.username },
            to: { uid: recipientSnap.value.uid },
          }).then(() => recordRecentRecipient(user.uid, recipientSnap.value))
        : sendWordToGroup({
            word: wordSnap,
            note: noteSnap,
            from: { uid: user.uid, username: profile.username },
            group: recipientSnap.value,
          });

    const label =
      recipientSnap.kind === 'friend'
        ? `@${recipientSnap.value.username}`
        : recipientSnap.value.name;

    sendPromise
      .then(() => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        setSentTo(label);
        if (sentToTimer.current) clearTimeout(sentToTimer.current);
        sentToTimer.current = setTimeout(() => setSentTo(null), 2000);
        if (recipientSnap.kind === 'friend') {
          getRecentRecipients(user.uid).then(setRecents).catch(() => {});
        }
      })
      .catch((e: any) => {
        setWord(wordSnap);
        setNote(noteSnap ?? '');
        setShowNote(!!noteSnap);
        setSendError(e?.message ?? "Couldn't send — tap Shoot to try again.");
      })
      .finally(() => {
        setSending(false);
        wordInputRef.current?.focus();
      });
  };

  const onPressSend = () => {
    if (!word.trim()) {
      Alert.alert('Type a word first.');
      return;
    }
    if (!recipient) {
      Alert.alert('Pick someone to send to.');
      return;
    }
    if (sending) return;
    cardRef.current?.fire();
  };

  const onSwipeRejected = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    if (!word.trim()) {
      Alert.alert('Type a word first.');
    } else if (!recipient) {
      Alert.alert('Pick someone to send to.');
    }
  };

  const onAddByUsername = async () => {
    setUsernameError(null);
    const friend = await findFriendByUsername(usernameInput);
    if (!friend) {
      setUsernameError('No user found with that username.');
      return;
    }
    setRecipient({ kind: 'friend', value: friend });
    setUsernameInput('');
    setUsernameError(null);
    setShowUsernamePicker(false);
  };

  const thumbZonePadBottom = Math.max(insets.bottom, space.s3);

  return (
    <Screen tone="cream" padded={false}>
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
      >
        <View style={styles.fill}>
          {/* Top region: header + recipient picker */}
          <ScrollView
            style={styles.fill}
            contentContainerStyle={styles.topScroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text variant="h1" style={{ marginBottom: space.s4 }}>
              Send a word
            </Text>

            <View>
              <Text variant="uppercaseLabel" color={palette.textBlackSoft}>
                Send to
              </Text>
              <View style={{ marginTop: space.s2 }}>
                {recipient ? (
                  <View style={styles.selectedRow}>
                    <View style={styles.selectedTag}>
                      <Ionicons
                        name={recipient.kind === 'group' ? 'people' : 'person'}
                        size={16}
                        color={palette.white}
                      />
                      <Text variant="smallStrong" color={palette.white}>
                        {recipient.kind === 'friend'
                          ? `@${recipient.value.username}`
                          : recipient.value.name}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 2 }}>
                      {recipient.kind === 'group' && recipient.value.memberUids.length > 0 && (
                        <Text variant="micro" color={palette.textBlackSoft}>
                          {recipient.value.memberUids.length}{' '}
                          {recipient.value.memberUids.length === 1 ? 'person' : 'people'}
                        </Text>
                      )}
                      <Pressable onPress={() => setRecipient(null)} hitSlop={8}>
                        <Text variant="smallStrong" color={palette.textBlackSoft}>
                          Change
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <ChipRow>
                    {recents.map((r) => (
                      <Chip
                        key={r.uid}
                        label={`@${r.username}`}
                        iconLeft={<Ionicons name="person" size={12} color={palette.greenAccent} />}
                        onPress={() => setRecipient({ kind: 'friend', value: r })}
                      />
                    ))}
                    {groups.map((g) => (
                      <Chip
                        key={g.id}
                        label={g.name}
                        iconLeft={<Ionicons name="people" size={12} color={palette.greenAccent} />}
                        onPress={() => setRecipient({ kind: 'group', value: g })}
                      />
                    ))}
                    <Chip
                      label="+ Add by username"
                      onPress={() => setShowUsernamePicker(true)}
                    />
                    <Chip
                      label="+ New Group"
                      onPress={() => router.push('/groups/new')}
                    />
                  </ChipRow>
                )}
              </View>

              {showUsernamePicker && !recipient ? (
                <View style={{ marginTop: space.s3, gap: space.s2 }}>
                  <FloatingLabelInput
                    label="Username"
                    value={usernameInput}
                    onChangeText={(t) => { setUsernameInput(t); if (usernameError) setUsernameError(null); }}
                    autoCapitalize="none"
                    autoCorrect={false}
                    onSubmitEditing={onAddByUsername}
                    error={usernameError ?? undefined}
                  />
                  <PillButton
                    label="Find friend"
                    variant="outlined"
                    onPress={onAddByUsername}
                  />
                </View>
              ) : null}
            </View>
          </ScrollView>

          {/* Bottom thumb zone: anchored input card + Shoot trigger */}
          <View style={[styles.thumbZone, { paddingBottom: thumbZonePadBottom }]}>
            {sentTo ? (
              <View style={styles.sentBanner}>
                <Ionicons name="checkmark-circle" size={15} color={palette.white} />
                <Text variant="smallStrong" color={palette.white}>
                  Sent to {sentTo}
                </Text>
              </View>
            ) : null}
            {sendError ? (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={15} color={palette.white} />
                <Text variant="smallStrong" color={palette.white}>
                  {sendError}
                </Text>
              </View>
            ) : null}
            <ShootableCard
              ref={cardRef}
              canShoot={canShoot}
              onShoot={onShoot}
              onRejected={onSwipeRejected}
            >
              <Text variant="uppercaseLabel" color={palette.textBlackSoft}>
                Word
              </Text>
              <TextInput
                ref={wordInputRef}
                value={word}
                onChangeText={(text) => { setWord(text); if (sendError) setSendError(null); }}
                placeholder="ephemeral"
                placeholderTextColor={palette.textBlackSoft}
                autoCorrect={false}
                autoCapitalize="none"
                returnKeyType="next"
                style={styles.wordInput}
              />
              {showNote ? (
                <FloatingLabelInput
                  label="Note (optional)"
                  value={note}
                  onChangeText={setNote}
                  multiline
                  style={{ minHeight: 60, textAlignVertical: 'top' }}
                />
              ) : (
                <Pressable onPress={() => setShowNote(true)} style={styles.noteToggle}>
                  <Ionicons name="add-circle-outline" size={16} color={palette.greenAccent} />
                  <Text variant="smallStrong" color={palette.greenAccent}>
                    Add a note
                  </Text>
                </Pressable>
              )}
            </ShootableCard>

            <PillButton
              label={sending ? 'Sending…' : 'Shoot'}
              onPress={onPressSend}
              loading={sending}
              fullWidth
              size="large"
              variant="primary"
              iconLeft={
                sending ? null : <Ionicons name="arrow-up" size={18} color={palette.white} />
              }
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  topScroll: {
    paddingHorizontal: space.s3,
    paddingTop: space.s4,
    paddingBottom: space.s3,
  },
  thumbZone: {
    paddingHorizontal: space.s3,
    paddingTop: space.s3,
    gap: space.s3,
    backgroundColor: palette.white,
    borderTopWidth: 1,
    borderTopColor: palette.ceramic,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: -2 },
    elevation: 4,
  },
  wordInput: {
    ...type.display,
    fontSize: 40,
    lineHeight: 48,
    marginTop: space.s2,
    marginBottom: space.s3,
    color: palette.textBlack,
  },
  noteToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  selectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedTag: {
    backgroundColor: palette.greenAccent,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: palette.greenAccent,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: palette.red,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
  },
});
