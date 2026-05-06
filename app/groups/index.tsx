import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { Card } from '@/components/Card';
import { PillButton } from '@/components/PillButton';
import { useAuth } from '@/lib/auth';
import { subscribeToGroups } from '@/lib/db';
import { Group } from '@/lib/types';
import { palette, space } from '@/constants/theme';

export default function GroupsScreen() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);

  useEffect(() => {
    if (!user) return;
    return subscribeToGroups(user.uid, setGroups);
  }, [user]);

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

      {groups.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="people-outline" size={36} color={palette.textBlackSoft} />
          <Text variant="body" color={palette.textBlackSoft} style={{ marginTop: space.s2, textAlign: 'center' }}>
            No groups yet.{'\n'}Create one to send a word to multiple people at once.
          </Text>
        </View>
      ) : (
        <View style={{ marginTop: space.s4, gap: space.s2 }}>
          {groups.map((g) => (
            <Pressable
              key={g.id}
              onPress={() => router.push({ pathname: '/groups/[id]', params: { id: g.id } })}
            >
              <Card style={styles.groupRow}>
                <View style={styles.groupLeft}>
                  <Ionicons name="people" size={20} color={palette.greenAccent} />
                  <Text variant="bodyMedium">{g.name}</Text>
                </View>
                <Text variant="small" color={palette.textBlackSoft}>
                  {g.memberUids.length} {g.memberUids.length === 1 ? 'person' : 'people'}
                </Text>
              </Card>
            </Pressable>
          ))}
        </View>
      )}
    </Screen>
  );
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
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.s5,
    gap: 0,
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
  },
});
