import { Redirect, Stack } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { Loading } from '../../src/components/ui';

export default function GuestLayout() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <Loading />;
  if (!user) return <Redirect href="/guest-login" />;
  if (user.role !== 'guest') return <Redirect href="/" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
