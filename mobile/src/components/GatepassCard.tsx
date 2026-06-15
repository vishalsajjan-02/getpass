import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Gatepass } from '../types';
import {
  formatGatepassReason,
  formatTime,
  getGatepassStatusLabel,
  isPendingGatepassStatus,
} from '../lib/gatepass';
import { Badge, colors } from './ui';

const statusTone = (status: Gatepass['status']) => {
  if (status === 'approved') return 'success' as const;
  if (status === 'active') return 'info' as const;
  if (status === 'completed') return 'success' as const;
  if (status === 'rejected' || status === 'cancelled') return 'danger' as const;
  if (isPendingGatepassStatus(status)) return 'warning' as const;
  return 'default' as const;
};

export const GatepassCard: React.FC<{
  gatepass: Gatepass;
  showUser?: boolean;
  footer?: React.ReactNode;
}> = ({ gatepass, showUser, footer }) => (
  <View style={styles.card}>
    <View style={styles.row}>
      <Text style={styles.reason} numberOfLines={2}>
        {formatGatepassReason(gatepass)}
      </Text>
      <Badge label={getGatepassStatusLabel(gatepass.status)} tone={statusTone(gatepass.status)} />
    </View>
    {showUser && gatepass.profiles?.name ? (
      <Text style={styles.user}>{gatepass.profiles.name}</Text>
    ) : null}
    <Text style={styles.date}>Date: {gatepass.date}</Text>
    {(gatepass.checked_out_at || gatepass.checked_in_at) && (
      <Text style={styles.times}>
        {gatepass.checked_out_at ? `OUT ${formatTime(gatepass.checked_out_at)}` : ''}
        {gatepass.checked_out_at && gatepass.checked_in_at ? ' · ' : ''}
        {gatepass.checked_in_at ? `IN ${formatTime(gatepass.checked_in_at)}` : ''}
      </Text>
    )}
    {footer}
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' },
  reason: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.text },
  user: { fontSize: 14, color: colors.text, marginTop: 6 },
  date: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  times: { fontSize: 12, color: colors.info, marginTop: 4, fontWeight: '500' },
});
