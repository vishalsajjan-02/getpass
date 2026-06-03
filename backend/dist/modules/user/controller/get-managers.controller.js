"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getManagersHandler = void 0;
const get_managers_service_1 = require("../service/get-managers.service");
const response_utils_1 = require("../../../utils/response.utils");
const getManagersHandler = async (_req, res) => {
    try {
        (0, response_utils_1.sendSuccess)(res, await (0, get_managers_service_1.getManagers)());
    }
    catch (err) {
        (0, response_utils_1.sendError)(res, err.message, 500);
    }
};
exports.getManagersHandler = getManagersHandler;
//# sourceMappingURL=get-managers.controller.js.map