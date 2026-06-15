import { useState } from 'react';
import { Alert, ScrollView } from 'react-native';
import { AppHeader } from '../../src/components/AppHeader';
import { Button, Input, Loading, Screen, Subtitle } from '../../src/components/ui';
import { useCreateGatepass, useGatepassReasons } from '../../src/hooks/useGatepasses';
import { todayDateString } from '../../src/lib/gatepass';

export default function GuestFormScreen() {
  const { data: reasons = [], isLoading } = useGatepassReasons();
  const createMutation = useCreateGatepass();
  const [reasonId, setReasonId] = useState('');
  const [description, setDescription] = useState('');
  const [destination, setDestination] = useState('');

  const selected = reasons.find((r) => r.id === reasonId);

  const handleSubmit = async () => {
    if (!reasonId) {
      Alert.alert('Select purpose', 'Choose a visit purpose.');
      return;
    }
    try {
      await createMutation.mutateAsync({
        reason_id: reasonId,
        reason_description: description.trim() || undefined,
        destination: destination.trim() || undefined,
        date: todayDateString(),
      });
      Alert.alert('Submitted', 'Your visit request was submitted.');
      setReasonId('');
      setDescription('');
      setDestination('');
    } catch (e) {
      Alert.alert('Failed', (e as Error).message);
    }
  };

  if (isLoading) return <Loading />;

  return (
    <Screen>
      <AppHeader title="Guest visit" />
      <ScrollView>
        <Subtitle>Submit a gatepass request for today</Subtitle>
        {reasons.map((reason) => (
          <Button
            key={reason.id}
            label={reason.name}
            variant={reasonId === reason.id ? 'primary' : 'secondary'}
            onPress={() => setReasonId(reason.id)}
          />
        ))}
        {selected && selected.name.toLowerCase() !== 'lunch' ? (
          <Input
            label="Details"
            value={description}
            onChangeText={setDescription}
            placeholder="Purpose details"
            multiline
          />
        ) : null}
        <Input
          label="Destination (optional)"
          value={destination}
          onChangeText={setDestination}
          placeholder="Where are you going?"
        />
        <Button label="Submit" onPress={handleSubmit} loading={createMutation.isPending} />
      </ScrollView>
    </Screen>
  );
}
