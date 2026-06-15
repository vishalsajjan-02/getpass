import { useMemo, useState } from 'react';
import { Alert, FlatList, RefreshControl, View } from 'react-native';
import { AppHeader } from '../../src/components/AppHeader';
import { GatepassCard } from '../../src/components/GatepassCard';
import { Button, EmptyState, Input, Loading, Screen } from '../../src/components/ui';
import { useGatepasses, useUpdateGatepassStatus } from '../../src/hooks/useGatepasses';
import { isPermanentOutGatepass, todayDateString } from '../../src/lib/gatepass';

export default function GatekeeperGatepassesScreen() {
  const { data: gatepasses = [], isLoading, refetch, isFetching } = useGatepasses();
  const updateMutation = useUpdateGatepassStatus();
  const [search, setSearch] = useState('');
  const today = todayDateString();

  const todayList = useMemo(() => {
    const list = gatepasses.filter((g) => String(g.date).slice(0, 10) === today);
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (g) =>
        g.profiles?.name?.toLowerCase().includes(q) ||
        g.reason_name.toLowerCase().includes(q) ||
        g.id.toLowerCase().includes(q),
    );
  }, [gatepasses, search, today]);

  const markOut = async (id: string) => {
    try {
      await updateMutation.mutateAsync({ id, status: 'active' });
    } catch (e) {
      Alert.alert('Error', (e as Error).message);
    }
  };

  const markIn = async (id: string) => {
    try {
      await updateMutation.mutateAsync({ id, status: 'completed' });
    } catch (e) {
      Alert.alert('Error', (e as Error).message);
    }
  };

  if (isLoading) return <Loading />;

  return (
    <Screen>
      <AppHeader title="Today's gatepasses" />
      <Input placeholder="Search employee or reason..." value={search} onChangeText={setSearch} />

      <FlatList
        data={todayList}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} />}
        renderItem={({ item }) => (
          <GatepassCard
            gatepass={item}
            showUser
            footer={
              <View style={{ marginTop: 8, flexDirection: 'row', gap: 8 }}>
                {item.status === 'approved' && (
                  <Button label="Out" variant="success" onPress={() => markOut(item.id)} />
                )}
                {item.status === 'active' && !isPermanentOutGatepass(item) && (
                  <Button label="In" onPress={() => markIn(item.id)} />
                )}
              </View>
            }
          />
        )}
        ListEmptyComponent={<EmptyState message="No gatepasses for today." />}
      />
    </Screen>
  );
}
