import { Redirect } from 'expo-router';
import { useAuth } from '../src/contexts/AuthContext';
import { roleHomePath } from '../src/lib/routing';
import { Loading } from '../src/components/ui';

export default function Index() {
  const { user, isLoading } = useAuth();

  if (isLoading) return <Loading />;

  if (!user) return <Redirect href="/login" />;

  return <Redirect href={roleHomePath(user.role)} />;
}
