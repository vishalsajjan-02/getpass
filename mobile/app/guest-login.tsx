import { Link, Redirect } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import { useAuth } from '../src/contexts/AuthContext';
import { roleHomePath } from '../src/lib/routing';
import { Button, Input, Screen, Subtitle, Title, colors, Loading } from '../src/components/ui';

export default function GuestLoginScreen() {
  const { user, isLoading, guestLogin } = useAuth();
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (isLoading) return <Loading />;
  if (user) return <Redirect href={roleHomePath(user.role)} />;

  const handleSubmit = async () => {
    if (!code.trim()) {
      Alert.alert('Code required', 'Enter your guest access code.');
      return;
    }
    setSubmitting(true);
    const { error } = await guestLogin(code.trim());
    setSubmitting(false);
    if (error) Alert.alert('Guest login failed', error);
  };

  return (
    <Screen>
      <Title>Guest access</Title>
      <Subtitle>Enter the guest code provided at reception</Subtitle>
      <Input label="Guest code" value={code} onChangeText={setCode} autoCapitalize="characters" />
      <Button label="Continue" onPress={handleSubmit} loading={submitting} />
      <Link href="/login" style={styles.link}>
        <Text style={styles.linkText}>← Back to sign in</Text>
      </Link>
    </Screen>
  );
}

const styles = StyleSheet.create({
  link: { marginTop: 20, alignSelf: 'center' },
  linkText: { color: colors.primary, fontWeight: '600' },
});
