import { useMemo } from 'react';
import { Alert, FlatList, RefreshControl, View } from 'react-native';
import { AppHeader } from '../../src/components/AppHeader';
import { GatepassCard } from '../../src/components/GatepassCard';
import { Button, EmptyState, Loading, Screen } from '../../src/components/ui';
import { useAuth } from '../../src/contexts/AuthContext';
import { useGatepasses, useUpdateGatepassStatus } from '../../src/hooks/useGatepasses';
import type { Gatepass } from '../../src/types';

const isActionable = (gatepass: Gatepass, role: string, userId: string): boolean => {
  const pendingApproval = gatepass.approval_requests?.find((a) => a.status === 'pending');
  if (!pendingApproval) return false;
  if (pendingApproval.approver_user_id !== userId) return false;
  if (role === 'manager') {
    return (
      gatepass.status === 'pending_manager_approval' &&
      pendingApproval.approver_role === 'manager'
    );
  }
  if (role === 'admin') {
    return (
      gatepass.status === 'pending_admin_approval' ||
      gatepass.status === 'pending_manager_approval'
    ) && pendingApproval.approver_role === 'admin';
  }
  return false;
};

export default function ManagerApprovalsScreen() {
  const { user } = useAuth();
  const { data: gatepasses = [], isLoading, refetch, isFetching } = useGatepasses();
  const updateMutation = useUpdateGatepassStatus();

  const pending = useMemo(
    () =>
      gatepasses.filter((g) => user && isActionable(g, user.role, user.id)),
    [gatepasses, user],
  );

  const act = async (id: string, status: 'approved' | 'rejected', step?: 1 | 2) => {
    try {
      await updateMutation.mutateAsync({
        id,
        status,
        approval_step: step,
        remarks: status === 'approved' ? 'Approved via mobile' : 'Rejected via mobile',
      });
    } catch (e) {
      Alert.alert('Error', (e as Error).message);
    }
  };

  if (isLoading || !user) return <Loading />;

  const title = user.role === 'admin' ? 'Admin approvals' : 'Manager approvals';

  return (
    <Screen>
      <AppHeader title={title} />
      <FlatList
        data={pending}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} />}
        renderItem={({ item }) => (
          <GatepassCard
            gatepass={item}
            showUser
            footer={
              <View style={{ marginTop: 8, flexDirection: 'row', gap: 8 }}>
                <Button
                  label="Approve"
                  variant="success"
                  onPress={() =>
                    act(
                      item.id,
                      'approved',
                      user.role === 'admin' && item.status === 'pending_manager_approval'
                        ? 1
                        : 2,
                    )
                  }
                />
                <Button
                  label="Reject"
                  variant="danger"
                  onPress={() =>
                    act(
                      item.id,
                      'rejected',
                      user.role === 'admin' && item.status === 'pending_manager_approval'
                        ? 1
                        : 2,
                    )
                  }
                />
              </View>
            }
          />
        )}
        ListEmptyComponent={<EmptyState message="No pending approvals for you." />}
      />
    </Screen>
  );
}
