import { Redirect, Stack } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { Loading } from '../../src/components/ui';

export default function ManagerLayout() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <Loading />;
  if (!user) return <Redirect href="/login" />;
  if (user.role !== 'admin' && user.role !== 'manager') return <Redirect href="/" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
