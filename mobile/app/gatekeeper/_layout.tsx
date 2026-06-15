import { Redirect, Tabs } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { Loading, colors } from '../../src/components/ui';

export default function GatekeeperLayout() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <Loading />;
  if (!user) return <Redirect href="/login" />;
  if (user.role !== 'gatekeeper') return <Redirect href="/" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Gatepasses' }} />
      <Tabs.Screen name="timing" options={{ title: 'Timing' }} />
    </Tabs>
  );
}
