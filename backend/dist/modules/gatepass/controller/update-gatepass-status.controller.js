"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateStatus = void 0;
const update_gatepass_status_service_1 = require("../service/update-gatepass-status.service");
const response_utils_1 = require("../../../utils/response.utils");
const updateStatus = async (req, res) => {
    try {
        const input = req.body;
        if (!input.status) {
            (0, response_utils_1.sendError)(res, 'status is required');
            return;
        }
        (0, response_utils_1.sendSuccess)(res, await (0, update_gatepass_status_service_1.updateGatepassStatus)(req.params.id, input, req.user.userId, req.user.role));
    }
    catch (err) {
        (0, response_utils_1.sendError)(res, err.message);
    }
};
exports.updateStatus = updateStatus;
//# sourceMappingURL=update-gatepass-status.controller.js.map