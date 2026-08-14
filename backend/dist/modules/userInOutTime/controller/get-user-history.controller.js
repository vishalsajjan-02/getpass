"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserHistoryHandler = void 0;
const get_user_history_service_1 = require("../service/get-user-history.service");
const response_utils_1 = require("../../../utils/response.utils");
const getUserHistoryHandler = async (req, res) => {
    try {
        const actor = req.user;
        const targetUserId = req.params.userId;
        // Managers and employees may only view their own attendance history.
        if ((actor?.role === 'manager' || actor?.role === 'employee') &&
            actor.userId !== targetUserId) {
            (0, response_utils_1.sendError)(res, 'You can only view your own attendance', 403);
            return;
        }
        const month = typeof req.query.month === 'string' ? req.query.month : undefined;
        if (month) {
            (0, response_utils_1.sendSuccess)(res, await (0, get_user_history_service_1.getUserMonthAttendance)(targetUserId, month));
            return;
        }
        const fromDate = typeof req.query.from === 'string' ? req.query.from : undefined;
        const toDate = typeof req.query.to === 'string' ? req.query.to : undefined;
        (0, response_utils_1.sendSuccess)(res, await (0, get_user_history_service_1.getUserHistory)(targetUserId, fromDate, toDate));
    }
    catch (err) {
        (0, response_utils_1.sendError)(res, err.message, 400);
    }
};
exports.getUserHistoryHandler = getUserHistoryHandler;
//# sourceMappingURL=get-user-history.controller.js.map