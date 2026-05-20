import { useEffect, useState } from 'react';
import { Alert, Linking, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { Card } from '@/components/Card';
import { PillButton } from '@/components/PillButton';
import { FloatingLabelInput } from '@/components/FloatingLabelInput';
import { useAuth } from '@/lib/auth';
import { subscribeToBank } from '@/lib/db';
import { palette, space } from '@/constants/theme';

const PRIVACY_URL = 'https://rio413.github.io/wordshot/privacy.html';
const TERMS_URL = 'https://rio413.github.io/wordshot/terms.html';

const appVersion = Constants.expoConfig?.version ?? '1.0.0';

export default function ProfileScreen() {
  const { user, profile, isEmailUser, signOut, changePassword, deleteAccount } = useAuth();
  const [savedCount, setSavedCount] = useState(0);

  // Change password modal
  const [pwVisible, setPwVisible] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwBusy, setPwBusy] = useState(false);

  // Delete account modal
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [deletePw, setDeletePw] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    return subscribeToBank(user.uid, (words) => setSavedCount(words.length));
  }, [user]);

  const onSignOut = () => {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  const resetPwModal = () => {
    setCurrentPw('');
    setNewPw('');
    setConfirmPw('');
    setPwError(null);
    setPwBusy(false);
  };

  const onChangePassword = async () => {
    setPwError(null);
    if (!currentPw) { setPwError('Enter your current password.'); return; }
    if (newPw.length < 6) { setPwError('New password must be at least 6 characters.'); return; }
    if (newPw !== confirmPw) { setPwError('Passwords do not match.'); return; }
    setPwBusy(true);
    try {
      await changePassword(currentPw, newPw);
      setPwVisible(false);
      resetPwModal();
      Alert.alert('Password updated', 'Your password has been changed.');
    } catch (e: any) {
      setPwError(e?.message ?? 'Could not update password.');
    } finally {
      setPwBusy(false);
    }
  };

  const resetDeleteModal = () => {
    setDeletePw('');
    setDeleteError(null);
    setDeleteBusy(false);
  };

  const onDeleteAccount = async () => {
    setDeleteError(null);
    if (isEmailUser && !deletePw) { setDeleteError('Enter your password to confirm.'); return; }
    setDeleteBusy(true);
    try {
      await deleteAccount(isEmailUser ? deletePw : undefined);
    } catch (e: any) {
      setDeleteError(e?.message ?? 'Could not delete account.');
      setDeleteBusy(false);
    }
  };

  const memberSince = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : null;

  return (
    <Screen tone="cream" padded={false}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text variant="h1" style={{ marginTop: space.s4, paddingHorizontal: space.s3 }}>
          Profile
        </Text>

        {/* Account info */}
        <Card style={styles.card}>
          <Row label="Username" value={`@${profile?.username ?? '—'}`} />
          <Divider />
          <Row label="Email" value={user?.email ?? '—'} small />
          {memberSince ? (
            <>
              <Divider />
              <Row label="Member since" value={memberSince} small />
            </>
          ) : null}
        </Card>

        {/* Stats */}
        <Card style={styles.card}>
          <View style={styles.statsRow}>
            <StatBlock value={savedCount} label="words saved" />
          </View>
        </Card>

        {/* Navigation */}
        <View style={styles.section}>
          <NavRow
            icon="people"
            label="My Groups"
            onPress={() => router.push('/groups')}
          />
          {isEmailUser && (
            <NavRow
              icon="lock-closed"
              label="Change password"
              onPress={() => setPwVisible(true)}
            />
          )}
        </View>

        {/* Legal */}
        <View style={styles.section}>
          <NavRow
            icon="document-text-outline"
            label="Privacy Policy"
            onPress={() => Linking.openURL(PRIVACY_URL)}
            external
          />
          <NavRow
            icon="reader-outline"
            label="Terms of Service"
            onPress={() => Linking.openURL(TERMS_URL)}
            external
          />
        </View>

        {/* Danger zone */}
        <View style={[styles.section, { gap: space.s2 }]}>
          <PillButton label="Sign out" variant="darkOutlined" onPress={onSignOut} fullWidth />
          <PillButton
            label="Delete account"
            variant="destructive"
            onPress={() => setDeleteVisible(true)}
            fullWidth
          />
        </View>

        <Text variant="micro" color={palette.textBlackSoft} style={styles.version}>
          Wordshot v{appVersion}
        </Text>
      </ScrollView>

      {/* Change password modal */}
      <Modal
        visible={pwVisible}
        transparent
        animationType="fade"
        onRequestClose={() => { setPwVisible(false); resetPwModal(); }}
      >
        <Pressable style={styles.overlay} onPress={() => { setPwVisible(false); resetPwModal(); }}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <View style={styles.modalTopRow}>
              <Text variant="h2">Change password</Text>
              <Ionicons
                name="close"
                size={22}
                color={palette.textBlackSoft}
                onPress={() => { setPwVisible(false); resetPwModal(); }}
                suppressHighlighting
              />
            </View>
            <View style={{ gap: space.s3, marginTop: space.s4 }}>
              <FloatingLabelInput
                label="Current password"
                secureTextEntry
                value={currentPw}
                onChangeText={(t) => { setCurrentPw(t); setPwError(null); }}
              />
              <FloatingLabelInput
                label="New password"
                secureTextEntry
                value={newPw}
                onChangeText={(t) => { setNewPw(t); setPwError(null); }}
              />
              <FloatingLabelInput
                label="Confirm new password"
                secureTextEntry
                value={confirmPw}
                onChangeText={(t) => { setConfirmPw(t); setPwError(null); }}
                error={pwError ?? undefined}
              />
              <PillButton
                label={pwBusy ? 'Updating…' : 'Update password'}
                variant="primary"
                loading={pwBusy}
                fullWidth
                onPress={onChangePassword}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Delete account modal */}
      <Modal
        visible={deleteVisible}
        transparent
        animationType="fade"
        onRequestClose={() => { setDeleteVisible(false); resetDeleteModal(); }}
      >
        <Pressable style={styles.overlay} onPress={() => { setDeleteVisible(false); resetDeleteModal(); }}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <View style={styles.modalTopRow}>
              <Text variant="h2">Delete account</Text>
              <Ionicons
                name="close"
                size={22}
                color={palette.textBlackSoft}
                onPress={() => { setDeleteVisible(false); resetDeleteModal(); }}
                suppressHighlighting
              />
            </View>
            <Text variant="small" color={palette.textBlackSoft} style={{ marginTop: space.s3 }}>
              This permanently deletes your account and all your data. This cannot be undone.
            </Text>
            {isEmailUser && (
              <View style={{ marginTop: space.s4 }}>
                <FloatingLabelInput
                  label="Enter your password to confirm"
                  secureTextEntry
                  value={deletePw}
                  onChangeText={(t) => { setDeletePw(t); setDeleteError(null); }}
                  error={deleteError ?? undefined}
                />
              </View>
            )}
            {!isEmailUser && deleteError ? (
              <Text variant="small" color={palette.red} style={{ marginTop: space.s2 }}>
                {deleteError}
              </Text>
            ) : null}
            <View style={{ marginTop: space.s4, gap: space.s2 }}>
              <PillButton
                label={deleteBusy ? 'Deleting…' : 'Yes, delete my account'}
                variant="destructive"
                loading={deleteBusy}
                fullWidth
                onPress={onDeleteAccount}
              />
              <PillButton
                label="Cancel"
                variant="outlined"
                fullWidth
                onPress={() => { setDeleteVisible(false); resetDeleteModal(); }}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

function Row({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <View style={styles.row}>
      <Text variant="uppercaseLabel" color={palette.textBlackSoft}>{label}</Text>
      <Text variant={small ? 'small' : 'bodyMedium'}>{value}</Text>
    </View>
  );
}

function StatBlock({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.statBlock}>
      <Text variant="h1" color={palette.starbucksGreen}>{value}</Text>
      <Text variant="micro" color={palette.textBlackSoft}>{label}</Text>
    </View>
  );
}

function NavRow({
  icon,
  label,
  onPress,
  external,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  external?: boolean;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && { opacity: 0.7 }}>
      <View style={styles.navRow}>
        <View style={styles.navLeft}>
          <Ionicons name={icon as any} size={20} color={palette.greenAccent} />
          <Text variant="bodyMedium">{label}</Text>
        </View>
        <Ionicons
          name={external ? 'open-outline' : 'chevron-forward'}
          size={16}
          color={palette.textBlackSoft}
        />
      </View>
    </Pressable>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: space.s9,
  },
  card: {
    marginHorizontal: space.s3,
    marginTop: space.s4,
  },
  section: {
    marginHorizontal: space.s3,
    marginTop: space.s4,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: palette.white,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: space.s2,
  },
  divider: {
    height: 1,
    backgroundColor: palette.ceramic,
    marginVertical: space.s1,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  statBlock: {
    alignItems: 'center',
    gap: 2,
    paddingVertical: space.s1,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: space.s3,
    paddingHorizontal: space.s3,
    borderBottomWidth: 1,
    borderBottomColor: palette.ceramic,
  },
  navLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s2,
  },
  version: {
    textAlign: 'center',
    marginTop: space.s5,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    paddingHorizontal: space.s4,
  },
  modalCard: {
    backgroundColor: palette.white,
    borderRadius: 16,
    padding: space.s4,
  },
  modalTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
