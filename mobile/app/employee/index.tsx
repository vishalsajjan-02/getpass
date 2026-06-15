import { useRouter } from 'expo-router';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { AppHeader } from '../../src/components/AppHeader';
import { GatepassCard } from '../../src/components/GatepassCard';
import { Button, EmptyState, Loading, Screen } from '../../src/components/ui';
import { useGatepasses } from '../../src/hooks/useGatepasses';
import { isPendingGatepassStatus } from '../../src/lib/gatepass';

export default function EmployeeHomeScreen() {
  const router = useRouter();
  const { data: gatepasses = [], isLoading, refetch, isFetching } = useGatepasses();

  const pending = gatepasses.filter((g) => isPendingGatepassStatus(g.status)).length;
  const approved = gatepasses.filter((g) => g.status === 'approved').length;

  if (isLoading) return <Loading />;

  const recent = [...gatepasses]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  return (
    <Screen>
      <AppHeader title="Employee" />
      <View style={styles.stats}>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{gatepasses.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{pending}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{approved}</Text>
          <Text style={styles.statLabel}>Approved</Text>
        </View>
      </View>

      <Button label="New gatepass request" onPress={() => router.push('/employee/new')} />
      <Button label="All my requests" variant="secondary" onPress={() => router.push('/employee/requests')} />

      <Text style={styles.section}>Recent requests</Text>
      <FlatList
        data={recent}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} />}
        renderItem={({ item }) => <GatepassCard gatepass={item} />}
        ListEmptyComponent={<EmptyState message="No gatepasses yet. Create your first request." />}
        style={styles.list}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  statBox: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  statNum: { fontSize: 20, fontWeight: '700', color: '#ea580c' },
  statLabel: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  section: { fontSize: 16, fontWeight: '600', marginTop: 16, marginBottom: 8, color: '#1f2937' },
  list: { flex: 1 },
});
