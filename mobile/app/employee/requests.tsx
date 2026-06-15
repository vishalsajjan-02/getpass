import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, FlatList, RefreshControl, View } from 'react-native';
import { AppHeader } from '../../src/components/AppHeader';
import { GatepassCard } from '../../src/components/GatepassCard';
import { Button, EmptyState, Input, Loading, Screen } from '../../src/components/ui';
import { useDeleteGatepass, useGatepasses } from '../../src/hooks/useGatepasses';
import { isPendingGatepassStatus } from '../../src/lib/gatepass';

export default function EmployeeRequestsScreen() {
  const router = useRouter();
  const { data: gatepasses = [], isLoading, refetch, isFetching } = useGatepasses();
  const deleteMutation = useDeleteGatepass();
  const [search, setSearch] = useState('');

  const filtered = gatepasses.filter((g) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      g.reason_name.toLowerCase().includes(q) ||
      (g.reason_description?.toLowerCase().includes(q) ?? false) ||
      g.status.toLowerCase().includes(q)
    );
  });

  const handleCancel = (id: string) => {
    Alert.alert('Cancel request', 'Withdraw this gatepass request?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, cancel',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteMutation.mutateAsync(id);
          } catch (e) {
            Alert.alert('Error', (e as Error).message);
          }
        },
      },
    ]);
  };

  if (isLoading) return <Loading />;

  return (
    <Screen>
      <AppHeader title="My requests" />
      <Input placeholder="Search..." value={search} onChangeText={setSearch} />
      <Button label="+ New request" onPress={() => router.push('/employee/new')} />

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} />}
        renderItem={({ item }) => (
          <GatepassCard
            gatepass={item}
            footer={
              isPendingGatepassStatus(item.status) ? (
                <View style={{ marginTop: 8 }}>
                  <Button
                    label="Cancel request"
                    variant="danger"
                    onPress={() => handleCancel(item.id)}
                    loading={deleteMutation.isPending}
                  />
                </View>
              ) : null
            }
          />
        )}
        ListEmptyComponent={<EmptyState message="No matching requests." />}
      />
    </Screen>
  );
}
