"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.remove = void 0;
const delete_gatepass_service_1 = require("../service/delete-gatepass.service");
const response_utils_1 = require("../../../utils/response.utils");
const remove = async (req, res) => {
    try {
        await (0, delete_gatepass_service_1.deleteGatepass)(req.params.id, req.user.userId, req.user.role);
        (0, response_utils_1.sendMessage)(res, 'Gatepass deleted successfully');
    }
    catch (err) {
        (0, response_utils_1.sendError)(res, err.message, 404);
    }
};
exports.remove = remove;
//# sourceMappingURL=delete-gatepass.controller.js.map