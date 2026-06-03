"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkOutHandler = void 0;
const check_out_service_1 = require("../service/check-out.service");
const response_utils_1 = require("../../../utils/response.utils");
const checkOutHandler = async (req, res) => {
    try {
        const userId = typeof req.body?.user_id === 'string' ? req.body.user_id : undefined;
        if (!userId) {
            (0, response_utils_1.sendError)(res, 'user_id is required');
            return;
        }
        (0, response_utils_1.sendSuccess)(res, await (0, check_out_service_1.checkOut)(userId));
    }
    catch (err) {
        (0, response_utils_1.sendError)(res, err.message);
    }
};
exports.checkOutHandler = checkOutHandler;
//# sourceMappingURL=check-out.controller.js.map