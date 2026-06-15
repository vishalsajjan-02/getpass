import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { colors } from './ui';

export const AppHeader: React.FC<{ title: string }> = ({ title }) => {
  const { user, logout } = useAuth();

  return (
    <View style={styles.header}>
      <View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.user}>
          {user?.name} · {user?.role}
        </Text>
      </View>
      <Pressable onPress={() => logout()} style={styles.logout}>
        <Text style={styles.logoutText}>Sign out</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 8,
  },
  title: { fontSize: 20, fontWeight: '700', color: colors.text },
  user: { fontSize: 12, color: colors.textMuted, marginTop: 2, textTransform: 'capitalize' },
  logout: { padding: 8 },
  logoutText: { color: colors.primary, fontWeight: '600', fontSize: 13 },
});
