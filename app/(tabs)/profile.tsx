import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { Card } from '@/components/Card';
import { PillButton } from '@/components/PillButton';
import { useAuth } from '@/lib/auth';
import { palette, space } from '@/constants/theme';

export default function ProfileScreen() {
  const { user, profile, signOut } = useAuth();

  const onSignOut = async () => {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  return (
    <Screen tone="cream">
      <Text variant="h1" style={{ marginTop: space.s4 }}>
        Profile
      </Text>

      <Card style={{ marginTop: space.s4 }}>
        <View style={styles.row}>
          <Text variant="uppercaseLabel" color={palette.textBlackSoft}>
            Username
          </Text>
          <Text variant="bodyMedium">@{profile?.username ?? '—'}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <Text variant="uppercaseLabel" color={palette.textBlackSoft}>
            Email
          </Text>
          <Text variant="small">{user?.email ?? '—'}</Text>
        </View>
      </Card>

      <Pressable onPress={() => router.push('/groups')} style={{ marginTop: space.s4 }}>
        <Card style={styles.navRow}>
          <View style={styles.navLeft}>
            <Ionicons name="people" size={20} color={palette.greenAccent} />
            <Text variant="bodyMedium">My Groups</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={palette.textBlackSoft} />
        </Card>
      </Pressable>

      <View style={{ marginTop: space.s5 }}>
        <PillButton label="Sign out" variant="destructive" onPress={onSignOut} fullWidth />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: space.s2,
  },
  divider: {
    height: 1,
    backgroundColor: palette.ceramic,
    marginVertical: space.s2,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: space.s3,
    paddingHorizontal: space.s3,
  },
  navLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s2,
  },
});
