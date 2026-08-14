"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkInHandler = void 0;
const check_in_service_1 = require("../service/check-in.service");
const database_1 = require("../../../config/database");
const response_utils_1 = require("../../../utils/response.utils");
const face_punch_shared_1 = require("../service/face-punch.shared");
const punch_location_1 = require("../service/punch-location");
const assertCanPunch = async (req, targetUserId) => {
    const role = req.user?.role;
    if (role === 'admin' || role === 'gatekeeper')
        return;
    if (req.user?.userId !== targetUserId) {
        throw Object.assign(new Error('You can only punch in for yourself'), { status: 403 });
    }
    const result = await (0, database_1.getDb)().query(`SELECT can_self_punch FROM users WHERE id = $1 AND deleted_at IS NULL`, [targetUserId]);
    if (!result.rows[0]?.can_self_punch) {
        throw Object.assign(new Error('Self punch is not enabled for your account. Ask an admin for permission.'), { status: 403 });
    }
};
const checkInHandler = async (req, res) => {
    try {
        const bodyUserId = typeof req.body?.user_id === 'string'
            ? req.body.user_id
            : typeof req.body?.userId === 'string'
                ? req.body.userId
                : undefined;
        const file = req.file;
        if (!file?.path) {
            (0, response_utils_1.sendError)(res, 'Live face photo is required for Punch In');
            return;
        }
        const actorUserId = req.user?.userId;
        const actorRole = req.user?.role;
        if (!actorUserId || !actorRole) {
            (0, response_utils_1.sendError)(res, 'Unauthorized', 401);
            return;
        }
        // Gatekeeper / admin kiosk: no user_id → identify face against all registered users.
        const useIdentify = !bodyUserId && (actorRole === 'gatekeeper' || actorRole === 'admin');
        if (!bodyUserId && !useIdentify) {
            (0, response_utils_1.sendError)(res, 'user_id is required');
            return;
        }
        let userId;
        let score;
        let relativePhotoPath;
        let userName;
        if (useIdentify) {
            const identified = await (0, face_punch_shared_1.identifyUserFromLivePhoto)(file.path);
            userId = identified.userId;
            score = identified.score;
            relativePhotoPath = identified.relativePhotoPath;
            userName = identified.userName;
        }
        else {
            userId = bodyUserId;
            await assertCanPunch(req, userId);
            const matched = await (0, face_punch_shared_1.requireFaceMatchForUser)(userId, file.path);
            score = matched.score;
            relativePhotoPath = matched.relativePhotoPath;
            userName = matched.userName;
        }
        const punchLocation = (0, punch_location_1.parsePunchLocation)(req.body);
        const row = await (0, check_in_service_1.checkIn)(userId, relativePhotoPath, { actorUserId, actorRole }, punchLocation);
        (0, response_utils_1.sendSuccess)(res, { ...row, face_match_score: score, identified_user_name: userName });
    }
    catch (err) {
        const status = err.status ?? 400;
        (0, response_utils_1.sendError)(res, err.message, status);
    }
};
exports.checkInHandler = checkInHandler;
//# sourceMappingURL=check-in.controller.js.map