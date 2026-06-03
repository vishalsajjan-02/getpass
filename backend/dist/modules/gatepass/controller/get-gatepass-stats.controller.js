"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStats = void 0;
const get_gatepass_stats_service_1 = require("../service/get-gatepass-stats.service");
const response_utils_1 = require("../../../utils/response.utils");
const getStats = async (req, res) => {
    try {
        const { userId, role } = req.user;
        (0, response_utils_1.sendSuccess)(res, await (0, get_gatepass_stats_service_1.getGatepassStats)(userId, role));
    }
    catch (err) {
        (0, response_utils_1.sendError)(res, err.message, 500);
    }
};
exports.getStats = getStats;
//# sourceMappingURL=get-gatepass-stats.controller.js.map