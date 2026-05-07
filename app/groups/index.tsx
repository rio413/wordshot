import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { Card } from '@/components/Card';
import { FloatingLabelInput } from '@/components/FloatingLabelInput';
import { PillButton } from '@/components/PillButton';
import { useAuth } from '@/lib/auth';
import { findGroupByCode, joinGroup, subscribeToGroups, subscribeToMemberGroups } from '@/lib/db';
import { Group } from '@/lib/types';
import { palette, space } from '@/constants/theme';

export default function GroupsScreen() {
  const { user, profile } = useAuth();
  const [myGroups, setMyGroups] = useState<Group[]>([]);
  const [memberGroups, setMemberGroups] = useState<Group[]>([]);

  // Join-by-code modal state
  const [joinVisible, setJoinVisible] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);
  const [foundGroup, setFoundGroup] = useState<{ groupId: string; groupName: string } | null>(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!user) return;
    const unsubOwned = subscribeToGroups(user.uid, setMyGroups);
    const unsubMember = subscribeToMemberGroups(user.uid, setMemberGroups);
    return () => { unsubOwned(); unsubMember(); };
  }, [user]);

  const resetJoinModal = () => {
    setCodeInput('');
    setCodeError(null);
    setFoundGroup(null);
    setJoining(false);
  };

  const onFindGroup = async () => {
    setCodeError(null);
    setFoundGroup(null);
    const cleaned = codeInput.trim().toUpperCase();
    if (!cleaned) {
      setCodeError('Enter a join code.');
      return;
    }
    const result = await findGroupByCode(cleaned);
    if (!result) {
      setCodeError('No group found with that code.');
      return;
    }
    const alreadyMember = memberGroups.some((g) => g.id === result.groupId);
    const alreadyOwner = myGroups.some((g) => g.id === result.groupId);
    if (alreadyMember || alreadyOwner) {
      setCodeError('You\'re already in this group.');
      return;
    }
    setFoundGroup(result);
  };

  const onJoin = async () => {
    if (!foundGroup || !user || !profile) return;
    setJoining(true);
    try {
      await joinGroup(foundGroup.groupId, {
        uid: user.uid,
        username: profile.username,
        displayName: profile.displayName ?? null,
      });
      setJoinVisible(false);
      resetJoinModal();
    } catch (e: any) {
      setCodeError(e?.message ?? 'Could not join group');
    } finally {
      setJoining(false);
    }
  };

  return (
    <Screen tone="cream">
      <View style={styles.header}>
        <Text variant="h1">My Groups</Text>
        <PillButton
          label="+ New"
          variant="dark"
          onPress={() => router.push('/groups/new')}
        />
      </View>

      {myGroups.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="people-outline" size={36} color={palette.textBlackSoft} />
          <Text variant="body" color={palette.textBlackSoft} style={{ marginTop: space.s2, textAlign: 'center' }}>
            No groups yet.{'\n'}Create one to send a word to multiple people at once.
          </Text>
        </View>
      ) : (
        <View style={{ marginTop: space.s4, gap: space.s2 }}>
          {myGroups.map((g) => (
            <GroupRow
              key={g.id}
              group={g}
              onPress={() => router.push({ pathname: '/groups/[id]', params: { id: g.id } })}
            />
          ))}
        </View>
      )}

      {memberGroups.length > 0 && (
        <>
          <Text variant="uppercaseLabel" color={palette.textBlackSoft} style={{ marginTop: space.s5, marginBottom: space.s2 }}>
            Groups I'm in
          </Text>
          <View style={{ gap: space.s2 }}>
            {memberGroups.map((g) => (
              <GroupRow key={g.id} group={g} />
            ))}
          </View>
        </>
      )}

      <Pressable onPress={() => setJoinVisible(true)} style={{ marginTop: space.s5 }}>
        <Card style={styles.joinRow}>
          <View style={styles.joinLeft}>
            <Ionicons name="key-outline" size={20} color={palette.greenAccent} />
            <Text variant="bodyMedium">Join a group</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={palette.textBlackSoft} />
        </Card>
      </Pressable>

      <Modal
        visible={joinVisible}
        transparent
        animationType="fade"
        onRequestClose={() => { setJoinVisible(false); resetJoinModal(); }}
      >
        <Pressable
          style={styles.overlay}
          onPress={() => { setJoinVisible(false); resetJoinModal(); }}
        >
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <View style={styles.modalTopRow}>
              <Text variant="uppercaseLabel" color={palette.textBlackSoft}>Join by code</Text>
              <Ionicons
                name="close"
                size={22}
                color={palette.textBlackSoft}
                onPress={() => { setJoinVisible(false); resetJoinModal(); }}
                suppressHighlighting
              />
            </View>

            <Text variant="small" color={palette.textBlackSoft} style={{ marginTop: space.s3, marginBottom: space.s3 }}>
              Ask the group owner for their 6-character join code.
            </Text>

            <FloatingLabelInput
              label="Join code"
              value={codeInput}
              onChangeText={(t) => { setCodeInput(t.toUpperCase()); setCodeError(null); setFoundGroup(null); }}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={6}
              error={codeError ?? undefined}
            />

            {foundGroup && (
              <View style={styles.foundGroup}>
                <Ionicons name="people" size={20} color={palette.greenAccent} />
                <Text variant="bodyMedium" style={{ flex: 1 }}>{foundGroup.groupName}</Text>
              </View>
            )}

            <View style={{ marginTop: space.s4, gap: space.s2 }}>
              {!foundGroup ? (
                <PillButton label="Find group" variant="dark" fullWidth onPress={onFindGroup} />
              ) : (
                <PillButton
                  label={joining ? 'Joining…' : `Join "${foundGroup.groupName}"`}
                  variant="dark"
                  loading={joining}
                  fullWidth
                  onPress={onJoin}
                />
              )}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

function GroupRow({ group, onPress }: { group: Group; onPress?: () => void }) {
  const inner = (
    <Card style={styles.groupRow}>
      <View style={styles.groupLeft}>
        <Ionicons name="people" size={20} color={palette.greenAccent} />
        <Text variant="bodyMedium">{group.name}</Text>
        {group.isPublic && (
          <Ionicons name="earth" size={14} color={palette.textBlackSoft} />
        )}
      </View>
      <View style={styles.groupRight}>
        <Text variant="small" color={palette.textBlackSoft}>
          {group.memberUids.length} {group.memberUids.length === 1 ? 'person' : 'people'}
        </Text>
        {onPress && <Ionicons name="chevron-forward" size={16} color={palette.textBlackSoft} />}
      </View>
    </Card>
  );
  if (!onPress) return inner;
  return <Pressable onPress={onPress}>{inner}</Pressable>;
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: space.s4,
    marginBottom: space.s2,
  },
  empty: {
    paddingTop: space.s6,
    alignItems: 'center',
    paddingHorizontal: space.s5,
  },
  groupRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: space.s3,
    paddingHorizontal: space.s3,
  },
  groupLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s2,
    flex: 1,
  },
  groupRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s2,
  },
  joinRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: space.s3,
    paddingHorizontal: space.s3,
  },
  joinLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s2,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    paddingHorizontal: space.s4,
  },
  modalCard: {
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.ceramic,
    borderRadius: 16,
    padding: space.s4,
  },
  modalTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  foundGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s2,
    marginTop: space.s3,
    padding: space.s3,
    backgroundColor: palette.greenLightWash,
    borderRadius: 8,
  },
});
