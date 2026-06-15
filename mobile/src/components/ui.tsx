import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

export const colors = {
  primary: '#ea580c',
  primaryDark: '#c2410c',
  bg: '#f8f9fb',
  card: '#ffffff',
  text: '#1f2937',
  textMuted: '#6b7280',
  border: '#e5e7eb',
  success: '#16a34a',
  danger: '#dc2626',
  warning: '#d97706',
  info: '#2563eb',
};

export const Screen: React.FC<{ children: React.ReactNode; style?: ViewStyle }> = ({
  children,
  style,
}) => <View style={[styles.screen, style]}>{children}</View>;

export const Card: React.FC<{ children: React.ReactNode; style?: ViewStyle }> = ({
  children,
  style,
}) => <View style={[styles.card, style]}>{children}</View>;

export const Title: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Text style={styles.title}>{children}</Text>
);

export const Subtitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Text style={styles.subtitle}>{children}</Text>
);

export const Button: React.FC<{
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  disabled?: boolean;
  loading?: boolean;
}> = ({ label, onPress, variant = 'primary', disabled, loading }) => (
  <Pressable
    onPress={onPress}
    disabled={disabled || loading}
    style={({ pressed }) => [
      styles.button,
      variant === 'secondary' && styles.buttonSecondary,
      variant === 'danger' && styles.buttonDanger,
      variant === 'success' && styles.buttonSuccess,
      (disabled || loading) && styles.buttonDisabled,
      pressed && !disabled && styles.buttonPressed,
    ]}
  >
    {loading ? (
      <ActivityIndicator color="#fff" />
    ) : (
      <Text style={styles.buttonText}>{label}</Text>
    )}
  </Pressable>
);

export const Input: React.FC<TextInputProps & { label?: string }> = ({ label, style, ...props }) => (
  <View style={styles.inputWrap}>
    {label ? <Text style={styles.inputLabel}>{label}</Text> : null}
    <TextInput
      placeholderTextColor={colors.textMuted}
      style={[styles.input, style]}
      {...props}
    />
  </View>
);

export const Badge: React.FC<{ label: string; tone?: 'default' | 'success' | 'warning' | 'danger' | 'info' }> = ({
  label,
  tone = 'default',
}) => (
  <View
    style={[
      styles.badge,
      tone === 'success' && styles.badgeSuccess,
      tone === 'warning' && styles.badgeWarning,
      tone === 'danger' && styles.badgeDanger,
      tone === 'info' && styles.badgeInfo,
    ]}
  >
    <Text style={styles.badgeText}>{label}</Text>
  </View>
);

export const Loading: React.FC = () => (
  <View style={styles.loading}>
    <ActivityIndicator size="large" color={colors.primary} />
  </View>
);

export const EmptyState: React.FC<{ message: string }> = ({ message }) => (
  <Text style={styles.empty}>{message}</Text>
);

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: 4 },
  subtitle: { fontSize: 14, color: colors.textMuted, marginBottom: 12 },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonSecondary: { backgroundColor: '#374151' },
  buttonDanger: { backgroundColor: colors.danger },
  buttonSuccess: { backgroundColor: colors.success },
  buttonDisabled: { opacity: 0.5 },
  buttonPressed: { opacity: 0.85 },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  inputWrap: { marginBottom: 12 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    backgroundColor: '#fff',
    color: colors.text,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#f3f4f6',
  },
  badgeSuccess: { backgroundColor: '#dcfce7' },
  badgeWarning: { backgroundColor: '#ffedd5' },
  badgeDanger: { backgroundColor: '#fee2e2' },
  badgeInfo: { backgroundColor: '#dbeafe' },
  badgeText: { fontSize: 11, fontWeight: '600', color: colors.text },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  empty: { textAlign: 'center', color: colors.textMuted, padding: 24, fontSize: 14 },
});
