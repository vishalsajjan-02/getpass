"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.create = void 0;
const create_gatepass_service_1 = require("../service/create-gatepass.service");
const response_utils_1 = require("../../../utils/response.utils");
const create = async (req, res) => {
    try {
        const input = req.body;
        if (!input.reason_id && !input.reason_name) {
            (0, response_utils_1.sendError)(res, 'reason_id is required');
            return;
        }
        const gatepass = await (0, create_gatepass_service_1.createGatepass)(req.user.userId, input);
        (0, response_utils_1.sendSuccess)(res, gatepass, 201);
    }
    catch (err) {
        (0, response_utils_1.sendError)(res, err.message);
    }
};
exports.create = create;
//# sourceMappingURL=create-gatepass.controller.js.map