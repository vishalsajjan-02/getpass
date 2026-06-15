import { Link, Redirect } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { useAuth } from '../src/contexts/AuthContext';
import { roleHomePath } from '../src/lib/routing';
import { Button, Input, Screen, Subtitle, Title, colors, Loading } from '../src/components/ui';
import { APP_NAME } from '../src/config/api';

export default function LoginScreen() {
  const { user, isLoading, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (isLoading) return <Loading />;
  if (user) return <Redirect href={roleHomePath(user.role)} />;

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Missing fields', 'Enter email and password.');
      return;
    }
    setSubmitting(true);
    const { error } = await login(email.trim(), password);
    setSubmitting(false);
    if (error) Alert.alert('Login failed', error);
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.scroll}>
          <Title>{APP_NAME}</Title>
          <Subtitle>Sign in with your company account</Subtitle>

          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="employee@company.com"
          />
          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="••••••••"
          />

          <Button label="Sign in" onPress={handleLogin} loading={submitting} />

          <Link href="/guest-login" style={styles.guestLink}>
            <Text style={styles.guestText}>Guest access with code →</Text>
          </Link>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingVertical: 24 },
  guestLink: { marginTop: 20, alignSelf: 'center' },
  guestText: { color: colors.primary, fontWeight: '600' },
});
