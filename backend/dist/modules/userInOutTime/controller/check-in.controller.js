"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkInHandler = void 0;
const check_in_service_1 = require("../service/check-in.service");
const response_utils_1 = require("../../../utils/response.utils");
const checkInHandler = async (req, res) => {
    try {
        const userId = typeof req.body?.user_id === 'string' ? req.body.user_id : undefined;
        if (!userId) {
            (0, response_utils_1.sendError)(res, 'user_id is required');
            return;
        }
        (0, response_utils_1.sendSuccess)(res, await (0, check_in_service_1.checkIn)(userId));
    }
    catch (err) {
        (0, response_utils_1.sendError)(res, err.message);
    }
};
exports.checkInHandler = checkInHandler;
//# sourceMappingURL=check-in.controller.js.map