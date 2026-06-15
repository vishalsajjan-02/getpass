import { useMemo, useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { AppHeader } from '../../src/components/AppHeader';
import {
  Badge,
  Button,
  EmptyState,
  Input,
  Loading,
  Screen,
  colors,
} from '../../src/components/ui';
import {
  useCheckInUser,
  useCheckOutUser,
  useDailyTimingReport,
} from '../../src/hooks/useUserInOutTime';
import { todayDateString } from '../../src/lib/gatepass';

const formatTime = (value?: string) => {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export default function GatekeeperTimingScreen() {
  const today = todayDateString();
  const { data: rows = [], isLoading, refetch, isFetching } = useDailyTimingReport(today);
  const checkIn = useCheckInUser();
  const checkOut = useCheckOutUser();
  const [search, setSearch] = useState('');
  const [pendingId, setPendingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.user_name.toLowerCase().includes(q));
  }, [rows, search]);

  const reported = rows.filter((r) => r.in_time).length;

  const handleIn = async (userId: string, name: string) => {
    setPendingId(userId);
    try {
      await checkIn.mutateAsync(userId);
      Alert.alert('Checked in', `${name} marked IN.`);
    } catch (e) {
      Alert.alert('Error', (e as Error).message);
    } finally {
      setPendingId(null);
    }
  };

  const handleOut = async (userId: string, name: string) => {
    setPendingId(userId);
    try {
      await checkOut.mutateAsync(userId);
      Alert.alert('Checked out', `${name} marked OUT.`);
    } catch (e) {
      Alert.alert('Error', (e as Error).message);
    } finally {
      setPendingId(null);
    }
  };

  if (isLoading) return <Loading />;

  return (
    <Screen>
      <AppHeader title="Reporting timing" />
      <Text style={styles.meta}>
        {today} · {reported}/{rows.length} reported
      </Text>
      <Input placeholder="Search by name..." value={search} onChangeText={setSearch} />

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.user_id}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} />}
        renderItem={({ item }) => {
          const status = item.in_time && item.out_time
            ? 'Completed'
            : item.in_time
              ? 'In office'
              : 'Not reported';
          const tone =
            status === 'Completed' ? 'success' : status === 'In office' ? 'info' : 'default';

          return (
            <View style={styles.row}>
              <View style={styles.rowMain}>
                <Text style={styles.name}>{item.user_name}</Text>
                <Text style={styles.times}>
                  IN {formatTime(item.in_time)} · OUT {formatTime(item.out_time)}
                </Text>
                <Badge label={status} tone={tone} />
              </View>
              <View style={styles.actions}>
                {!item.in_time ? (
                  <Button
                    label="In"
                    variant="success"
                    onPress={() => handleIn(item.user_id, item.user_name)}
                    loading={pendingId === item.user_id}
                  />
                ) : !item.out_time ? (
                  <Button
                    label="Out"
                    variant="secondary"
                    onPress={() => handleOut(item.user_id, item.user_name)}
                    loading={pendingId === item.user_id}
                  />
                ) : (
                  <Text style={styles.done}>Done</Text>
                )}
              </View>
            </View>
          );
        }}
        ListEmptyComponent={<EmptyState message="No users found." />}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  meta: { fontSize: 13, color: colors.textMuted, marginBottom: 8 },
  row: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    gap: 8,
  },
  rowMain: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600', color: colors.text },
  times: { fontSize: 12, color: colors.textMuted, marginVertical: 4 },
  actions: { justifyContent: 'center', minWidth: 72 },
  done: { fontSize: 12, color: colors.textMuted, textAlign: 'center' },
});
