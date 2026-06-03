"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getReasons = void 0;
const get_gatepass_reasons_service_1 = require("../service/get-gatepass-reasons.service");
const response_utils_1 = require("../../../utils/response.utils");
const getReasons = async (_req, res) => {
    try {
        (0, response_utils_1.sendSuccess)(res, await (0, get_gatepass_reasons_service_1.getGatepassReasons)());
    }
    catch (err) {
        (0, response_utils_1.sendError)(res, err.message, 500);
    }
};
exports.getReasons = getReasons;
//# sourceMappingURL=get-gatepass-reasons.controller.js.map