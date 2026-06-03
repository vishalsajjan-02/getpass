"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAll = void 0;
const get_gatepasses_service_1 = require("../service/get-gatepasses.service");
const response_utils_1 = require("../../../utils/response.utils");
const getAll = async (req, res) => {
    try {
        const { userId, role } = req.user;
        (0, response_utils_1.sendSuccess)(res, await (0, get_gatepasses_service_1.getGatepasses)(userId, role));
    }
    catch (err) {
        (0, response_utils_1.sendError)(res, err.message, 500);
    }
};
exports.getAll = getAll;
//# sourceMappingURL=get-all-gatepasses.controller.js.map