import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView } from 'react-native';
import { AppHeader } from '../../src/components/AppHeader';
import { Button, Input, Loading, Screen, Subtitle } from '../../src/components/ui';
import { useCreateGatepass, useGatepassReasons } from '../../src/hooks/useGatepasses';
import { todayDateString } from '../../src/lib/gatepass';

const LUNCH = 'Lunch';

export default function NewGatepassScreen() {
  const router = useRouter();
  const { data: reasons = [], isLoading } = useGatepassReasons();
  const createMutation = useCreateGatepass();
  const [reasonId, setReasonId] = useState('');
  const [description, setDescription] = useState('');

  const selected = reasons.find((r) => r.id === reasonId);
  const needsDescription = selected && selected.name !== LUNCH;

  const handleSubmit = async () => {
    if (!reasonId || !selected) {
      Alert.alert('Select purpose', 'Choose a reason for your gatepass.');
      return;
    }
    if (needsDescription && !description.trim()) {
      Alert.alert('Description required', 'Please enter a reason description.');
      return;
    }

    try {
      await createMutation.mutateAsync({
        reason_id: reasonId,
        reason_description: needsDescription ? description.trim() : undefined,
        date: todayDateString(),
      });
      Alert.alert('Submitted', 'Your gatepass request was sent for approval.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e) {
      Alert.alert('Failed', (e as Error).message);
    }
  };

  if (isLoading) return <Loading />;

  return (
    <Screen>
      <AppHeader title="New request" />
      <ScrollView>
        <Subtitle>Select purpose and submit for today</Subtitle>

        {reasons.map((reason) => (
          <Button
            key={reason.id}
            label={reason.name}
            variant={reasonId === reason.id ? 'primary' : 'secondary'}
            onPress={() => setReasonId(reason.id)}
          />
        ))}

        {needsDescription ? (
          <Input
            label="Reason description"
            value={description}
            onChangeText={setDescription}
            placeholder="Where are you going and why?"
            multiline
          />
        ) : null}

        <Button
          label="Submit request"
          onPress={handleSubmit}
          loading={createMutation.isPending}
        />
        <Button label="Cancel" variant="secondary" onPress={() => router.back()} />
      </ScrollView>
    </Screen>
  );
}
