import { useEffect, useRef, useState } from 'react';
import { Alert, Clipboard, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { FloatingLabelInput } from '@/components/FloatingLabelInput';
import { Chip, ChipRow } from '@/components/Chip';
import { PillButton } from '@/components/PillButton';
import { useAuth } from '@/lib/auth';
import {
  createGroup,
  deleteGroup,
  findFriendByUsername,
  subscribeToGroups,
  updateGroup,
} from '@/lib/db';
import { Friend, Group } from '@/lib/types';
import { palette, space } from '@/constants/theme';

const MAX_MEMBERS = 25;

export default function GroupEditScreen() {
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';

  const [existingGroup, setExistingGroup] = useState<Group | null>(null);
  const [name, setName] = useState('');
  const [members, setMembers] = useState<Friend[]>([]);
  const [isPublic, setIsPublic] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (isNew || !user) return;
    const unsub = subscribeToGroups(user.uid, (groups) => {
      const found = groups.find((g) => g.id === id);
      if (found && !existingGroup) {
        setExistingGroup(found);
        setName(found.name);
        setMembers(found.members);
        setIsPublic(found.isPublic);
      }
    });
    return unsub;
  }, [id, isNew, user]);

  const onAddMember = async () => {
    setUsernameError(null);
    if (members.length >= MAX_MEMBERS) {
      setUsernameError(`Groups are limited to ${MAX_MEMBERS} people.`);
      return;
    }
    const friend = await findFriendByUsername(usernameInput);
    if (!friend) {
      setUsernameError('No user found with that username.');
      return;
    }
    if (members.some((m) => m.uid === friend.uid)) {
      setUsernameError('Already in this group.');
      return;
    }
    setMembers((prev) => [...prev, friend]);
    setUsernameInput('');
    setUsernameError(null);
  };

  const onRemoveMember = (uid: string) => {
    setMembers((prev) => prev.filter((m) => m.uid !== uid));
  };

  const onSave = async () => {
    if (!user) return;
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert('Enter a group name.');
      return;
    }
    if (members.length === 0) {
      Alert.alert('Add at least one person.');
      return;
    }
    setSaving(true);
    try {
      if (isNew) {
        await createGroup({ ownerUid: user.uid, name: trimmed, members, isPublic });
      } else if (existingGroup) {
        await updateGroup(existingGroup.id, { name: trimmed, members, isPublic });
      }
      router.back();
    } catch (e: any) {
      Alert.alert('Could not save group', e?.message ?? 'Please try again.');
      setSaving(false);
    }
  };

  const onDelete = () => {
    if (!existingGroup) return;
    Alert.alert('Delete group', `Delete "${existingGroup.name}"? This can't be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteGroup(existingGroup.id).catch(() => {});
          router.back();
        },
      },
    ]);
  };

  const onCopyCode = () => {
    if (!existingGroup?.joinCode) return;
    Clipboard.setString(existingGroup.joinCode);
    Alert.alert('Copied!', `Share "${existingGroup.joinCode}" so others can join.`);
  };

  return (
    <Screen tone="cream">
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text variant="h1" style={{ marginBottom: space.s4 }}>
          {isNew ? 'New Group' : 'Edit Group'}
        </Text>

        <FloatingLabelInput
          label="Group name"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="next"
          onSubmitEditing={() => inputRef.current?.focus()}
        />

        <View style={styles.toggleRow}>
          <View style={styles.toggleLeft}>
            <Ionicons
              name={isPublic ? 'earth' : 'lock-closed'}
              size={18}
              color={isPublic ? palette.greenAccent : palette.textBlackSoft}
            />
            <View>
              <Text variant="bodyMedium">{isPublic ? 'Public group' : 'Private group'}</Text>
              <Text variant="micro" color={palette.textBlackSoft}>
                {isPublic
                  ? 'Anyone with the code can join'
                  : 'Invite only — share your code with people you choose'}
              </Text>
            </View>
          </View>
          <Switch
            value={isPublic}
            onValueChange={setIsPublic}
            trackColor={{ false: palette.ceramic, true: palette.greenAccent }}
            thumbColor={palette.white}
          />
        </View>

        {!isNew && existingGroup?.joinCode && (
          <View style={styles.codeRow}>
            <View>
              <Text variant="uppercaseLabel" color={palette.textBlackSoft}>
                Join code
              </Text>
              <Text variant="h2" style={{ letterSpacing: 4, marginTop: 2 }}>
                {existingGroup.joinCode}
              </Text>
            </View>
            <PillButton
              label="Copy"
              variant="outlined"
              onPress={onCopyCode}
            />
          </View>
        )}

        <Text variant="uppercaseLabel" color={palette.textBlackSoft} style={{ marginTop: space.s4 }}>
          Members ({members.length}/{MAX_MEMBERS})
        </Text>

        {members.length > 0 && (
          <ChipRow style={{ marginTop: space.s2 }}>
            {members.map((m) => (
              <Chip
                key={m.uid}
                label={`@${m.username}`}
                iconRight={<Ionicons name="close" size={12} color={palette.textBlack} />}
                onPress={() => onRemoveMember(m.uid)}
              />
            ))}
          </ChipRow>
        )}

        <View style={{ marginTop: space.s3, gap: space.s2 }}>
          <FloatingLabelInput
            ref={inputRef}
            label="Add by username"
            value={usernameInput}
            onChangeText={(t) => { setUsernameInput(t); if (usernameError) setUsernameError(null); }}
            autoCapitalize="none"
            autoCorrect={false}
            onSubmitEditing={onAddMember}
            error={usernameError ?? undefined}
          />
          <PillButton
            label="Add"
            variant="outlined"
            onPress={onAddMember}
          />
        </View>

        <View style={{ marginTop: space.s5, gap: space.s2 }}>
          <PillButton
            label={saving ? 'Saving…' : 'Save group'}
            variant="dark"
            loading={saving}
            fullWidth
            onPress={onSave}
          />
          {!isNew && (
            <PillButton
              label="Delete group"
              variant="destructive"
              fullWidth
              onPress={onDelete}
            />
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: space.s4,
    paddingBottom: space.s6,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: space.s4,
    paddingVertical: space.s3,
    paddingHorizontal: space.s3,
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.ceramic,
    borderRadius: 12,
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s2,
    flex: 1,
    marginRight: space.s3,
  },
  codeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: space.s4,
    paddingVertical: space.s3,
    paddingHorizontal: space.s3,
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.ceramic,
    borderRadius: 12,
  },
});
