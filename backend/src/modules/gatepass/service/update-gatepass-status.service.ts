import { getDb } from '../../../config/database';
import {
  calculateWorkingMinutesOutside,
  cancelPendingApprovalRequests,
  emitRealtimeUpdate,
  getApprovalRequestByStep,
  getGatepassByIdInternal,
  getPendingApprovalForActor,
  isPermanentOutGatepass,
} from './shared/gatepass.shared';
import type { GatepassWithProfile, UpdateGatepassStatusInput, UserRole } from '../../../types';

export const updateGatepassStatus = async (
  id: string,
  input: UpdateGatepassStatusInput,
  actorUserId: string,
  actorRole: UserRole,
): Promise<GatepassWithProfile> => {
  const pool = getDb();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const gatepass = await getGatepassByIdInternal(client, id);
    const nowIso = new Date().toISOString();

    const rejectReason = input.rejection_reason ?? input.remarks ?? 'Request rejected';

    if (input.status === 'cancelled') {
      const isOwner = gatepass.user_id === actorUserId;
      const canCancel = isOwner || actorRole === 'admin';

      if (!canCancel) {
        throw new Error('You are not allowed to cancel this gatepass');
      }

      if (gatepass.status === 'active' || gatepass.status === 'completed') {
        throw new Error('This gatepass can no longer be cancelled');
      }

      await client.query(
        `UPDATE gatepasses
         SET status = 'cancelled',
             updated_at = NOW()
         WHERE id = $1`,
        [id],
      );
      await cancelPendingApprovalRequests(client, id, input.remarks ?? 'Request cancelled');
    } else if (actorRole === 'manager' && (input.status === 'approved' || input.status === 'rejected')) {
      const approvalRequest = await getPendingApprovalForActor(client, id, actorUserId, 'manager');

      if (gatepass.status !== 'pending_manager_approval' || approvalRequest.status !== 'pending') {
        throw new Error('This gatepass is not awaiting manager approval');
      }

      if (input.status === 'approved') {
        await client.query(
          `UPDATE gatepass_approval_requests
           SET status = 'approved',
               remarks = $2,
               acted_at = $3,
               updated_at = NOW()
           WHERE id = $1`,
          [approvalRequest.id, input.remarks ?? 'Approved by manager', nowIso],
        );
        await client.query(
          `UPDATE gatepasses
           SET status = $2,
               updated_at = NOW()
           WHERE id = $1`,
          [
            id,
            (await getApprovalRequestByStep(client, id, 2)).status === 'approved'
              ? 'approved'
              : 'pending_admin_approval',
          ],
        );
      } else {
        await client.query(
          `UPDATE gatepass_approval_requests
           SET status = 'rejected',
               remarks = $2,
               acted_at = $3,
               updated_at = NOW()
           WHERE id = $1`,
          [approvalRequest.id, rejectReason, nowIso],
        );
        await client.query(
          `UPDATE gatepasses
           SET status = 'rejected',
               rejection_reason = $2,
               updated_at = NOW()
           WHERE id = $1`,
          [id, rejectReason],
        );
        await cancelPendingApprovalRequests(client, id, 'Cancelled after manager rejection');
      }
    } else if (actorRole === 'admin' && (input.status === 'approved' || input.status === 'rejected')) {
      const requestedStep = input.approval_step ?? 2;

      if (requestedStep === 1) {
        if (gatepass.approval_flow !== 'manager_then_admin') {
          throw new Error('Manager approval step is only available for Out requests');
        }
        if (gatepass.status !== 'pending_manager_approval') {
          throw new Error('This gatepass is not awaiting manager approval');
        }

        const managerApprovalRequest = await getApprovalRequestByStep(client, id, 1);
        if (managerApprovalRequest.status !== 'pending') {
          throw new Error('The manager approval step has already been processed');
        }

        if (input.status === 'approved') {
          await client.query(
            `UPDATE gatepass_approval_requests
             SET status = 'approved',
                 remarks = $2,
                 acted_at = $3,
                 updated_at = NOW()
             WHERE id = $1`,
            [managerApprovalRequest.id, input.remarks ?? 'Approved by admin for manager step', nowIso],
          );

          await client.query(
            `UPDATE gatepasses
             SET status = $2,
                 updated_at = NOW()
             WHERE id = $1`,
            [
              id,
              (await getApprovalRequestByStep(client, id, 2)).status === 'approved'
                ? 'approved'
                : 'pending_admin_approval',
            ],
          );
        } else {
          await client.query(
            `UPDATE gatepass_approval_requests
             SET status = 'rejected',
                 remarks = $2,
                 acted_at = $3,
                 updated_at = NOW()
             WHERE id = $1`,
            [managerApprovalRequest.id, rejectReason, nowIso],
          );
          await client.query(
            `UPDATE gatepasses
             SET status = 'rejected',
                 rejection_reason = $2,
                 updated_at = NOW()
             WHERE id = $1`,
            [id, rejectReason],
          );
          await cancelPendingApprovalRequests(client, id, 'Cancelled after admin rejected the manager step');
        }
      } else {
        const approvalRequest = await getPendingApprovalForActor(client, id, actorUserId, 'admin');

        if (
          !['pending_admin_approval', 'pending_manager_approval'].includes(gatepass.status)
          || approvalRequest.status !== 'pending'
        ) {
          throw new Error('This gatepass is not awaiting admin approval');
        }

        if (input.status === 'approved') {
          await client.query(
            `UPDATE gatepass_approval_requests
             SET status = 'approved',
                 remarks = $2,
                 acted_at = $3,
                 updated_at = NOW()
             WHERE id = $1`,
            [approvalRequest.id, input.remarks ?? 'Approved by admin', nowIso],
          );

          const managerApprovalPending = gatepass.approval_flow === 'manager_then_admin'
            && (await getApprovalRequestByStep(client, id, 1)).status === 'pending';

          await client.query(
            `UPDATE gatepasses
             SET status = $2,
                 updated_at = NOW()
             WHERE id = $1`,
            [id, managerApprovalPending ? 'pending_manager_approval' : 'approved'],
          );
        } else {
          await client.query(
            `UPDATE gatepass_approval_requests
             SET status = 'rejected',
                 remarks = $2,
                 acted_at = $3,
                 updated_at = NOW()
             WHERE id = $1`,
            [approvalRequest.id, rejectReason, nowIso],
          );
          await client.query(
            `UPDATE gatepasses
             SET status = 'rejected',
                 rejection_reason = $2,
                 updated_at = NOW()
             WHERE id = $1`,
            [id, rejectReason],
          );
          await cancelPendingApprovalRequests(client, id, 'Cancelled after admin rejection');
        }
      }
    } else if (actorRole === 'gatekeeper' && input.status === 'active') {
      if (gatepass.status !== 'approved') {
        throw new Error('Only approved gatepasses can be marked Out');
      }

      if (isPermanentOutGatepass(gatepass)) {
        await client.query(
          `UPDATE gatepasses
           SET status = 'completed',
               checked_out_at = $2,
               checked_out_by = $3,
               total_minutes_outside = 0,
               updated_at = NOW()
           WHERE id = $1`,
          [id, nowIso, actorUserId],
        );
      } else {
        await client.query(
          `UPDATE gatepasses
           SET status = 'active',
               checked_out_at = $2,
               checked_out_by = $3,
               updated_at = NOW()
           WHERE id = $1`,
          [id, nowIso, actorUserId],
        );
      }
    } else if (actorRole === 'gatekeeper' && input.status === 'completed') {
      if (isPermanentOutGatepass(gatepass)) {
        throw new Error('Out reason is permanent for the day — check-in is not allowed');
      }

      if (gatepass.status !== 'active' || !gatepass.checked_out_at) {
        throw new Error('Only active gatepasses can be marked In');
      }

      const checkedOutAt = new Date(gatepass.checked_out_at);
      const checkedInAt = new Date(nowIso);
      // 'out' type users leave permanently — no extra time is tracked
      const totalMinutesOutside = gatepass.gatepass_type !== 'out'
        ? calculateWorkingMinutesOutside(checkedOutAt, checkedInAt)
        : 0;

      await client.query(
        `UPDATE gatepasses
         SET status = 'completed',
             checked_in_at = $2,
             checked_in_by = $3,
             total_minutes_outside = $4,
             updated_at = NOW()
         WHERE id = $1`,
        [id, nowIso, actorUserId, totalMinutesOutside],
      );
    } else {
      throw new Error('This status update is not allowed for your role');
    }

    await client.query('COMMIT');
    const updatedGatepass = await getGatepassByIdInternal(getDb(), id);

    switch (updatedGatepass.status) {
      case 'approved':
        emitRealtimeUpdate(updatedGatepass, 'gatepass:approved');
        break;
      case 'rejected':
        emitRealtimeUpdate(updatedGatepass, 'gatepass:rejected');
        break;
      case 'active':
        emitRealtimeUpdate(updatedGatepass, 'gatepass:out');
        break;
      case 'completed':
        emitRealtimeUpdate(updatedGatepass, 'gatepass:in');
        break;
      case 'pending_admin_approval':
        emitRealtimeUpdate(updatedGatepass, 'gatepass:new-request');
        break;
      default:
        emitRealtimeUpdate(updatedGatepass);
        break;
    }

    return updatedGatepass;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
