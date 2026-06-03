"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOne = void 0;
const get_gatepass_by_id_service_1 = require("../service/get-gatepass-by-id.service");
const response_utils_1 = require("../../../utils/response.utils");
const getOne = async (req, res) => {
    try {
        const { userId, role } = req.user;
        (0, response_utils_1.sendSuccess)(res, await (0, get_gatepass_by_id_service_1.getGatepassById)(req.params.id, userId, role));
    }
    catch (err) {
        (0, response_utils_1.sendError)(res, err.message, 404);
    }
};
exports.getOne = getOne;
//# sourceMappingURL=get-gatepass-by-id.controller.js.map