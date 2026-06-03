"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createGatepass = void 0;
const database_1 = require("../../../config/database");
const gatepass_shared_1 = require("./shared/gatepass.shared");
const createGatepass = async (userId, input) => {
    const pool = (0, database_1.getDb)();
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const requester = await (0, gatepass_shared_1.getRequesterContext)(client, userId);
        const reason = await (0, gatepass_shared_1.resolveReason)(client, input);
        const reasonDescription = (0, gatepass_shared_1.optionalString)(input.reason_description);
        const normalizedReason = reason.name.trim().toLowerCase();
        const requiresReasonDescription = normalizedReason !== 'lunch';
        if (requiresReasonDescription && !reasonDescription) {
            throw new Error('Please enter reason description');
        }
        const approvalFlow = requester.role === 'employee' && normalizedReason === 'out'
            ? 'manager_then_admin'
            : 'admin_only';
        const initialStatus = approvalFlow === 'manager_then_admin' ? 'pending_manager_approval' : 'pending_admin_approval';
        if (approvalFlow === 'manager_then_admin' && !requester.manager_id) {
            throw new Error('No manager is assigned to this employee');
        }
        const adminUserId = await (0, gatepass_shared_1.getPrimaryAdminId)(client);
        const requestDate = input.date ?? new Date().toISOString().slice(0, 10);
        const gatepassType = normalizedReason === 'out' || input.gatepass_type === 'out' ? 'out' : 'out-in';
        const inserted = await client.query(`INSERT INTO gatepasses (
         user_id,
         reason_id,
         reason_description,
         destination,
         date,
         status,
         approval_flow,
         gatepass_type,
         is_emergency
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id`, [
            userId,
            reason.id,
            reasonDescription ?? null,
            input.destination ?? null,
            requestDate,
            initialStatus,
            approvalFlow,
            gatepassType,
            input.is_emergency ?? false,
        ]);
        const gatepassDbId = String(inserted.rows[0].id);
        if (approvalFlow === 'manager_then_admin') {
            await client.query(`INSERT INTO gatepass_approval_requests (
           gatepass_id,
           approver_user_id,
           approver_role,
           step,
           status
         )
         VALUES ($1, $2, 'manager', 1, 'pending')`, [gatepassDbId, requester.manager_id]);
        }
        await client.query(`INSERT INTO gatepass_approval_requests (
         gatepass_id,
         approver_user_id,
         approver_role,
         step,
         status
       )
       VALUES ($1, $2, 'admin', 2, 'pending')`, [gatepassDbId, adminUserId]);
        await client.query('COMMIT');
        const createdGatepass = await (0, gatepass_shared_1.getGatepassByIdInternal)((0, database_1.getDb)(), gatepassDbId);
        (0, gatepass_shared_1.emitRealtimeUpdate)(createdGatepass, 'gatepass:new-request');
        return createdGatepass;
    }
    catch (error) {
        await client.query('ROLLBACK');
        throw error;
    }
    finally {
        client.release();
    }
};
exports.createGatepass = createGatepass;
//# sourceMappingURL=create-gatepass.service.js.map