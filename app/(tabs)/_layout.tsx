import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { palette } from '@/constants/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: palette.greenAccent,
        tabBarInactiveTintColor: palette.textBlackSoft,
        tabBarStyle: {
          backgroundColor: palette.white,
          borderTopColor: palette.ceramic,
        },
        tabBarLabelStyle: { fontFamily: 'Inter-SemiBold', fontSize: 12 },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Send',
          tabBarIcon: ({ color, size }) => <Ionicons name="paper-plane" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="incoming"
        options={{
          title: 'Incoming',
          tabBarIcon: ({ color, size }) => <Ionicons name="mail" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="bank"
        options={{
          title: 'Bank',
          tabBarIcon: ({ color, size }) => <Ionicons name="bookmark" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <Ionicons name="person-circle" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
