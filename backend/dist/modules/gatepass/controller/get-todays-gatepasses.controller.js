"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getToday = void 0;
const get_todays_gatepasses_service_1 = require("../service/get-todays-gatepasses.service");
const response_utils_1 = require("../../../utils/response.utils");
const getToday = async (req, res) => {
    try {
        const { userId, role } = req.user;
        (0, response_utils_1.sendSuccess)(res, await (0, get_todays_gatepasses_service_1.getTodaysGatepasses)(userId, role));
    }
    catch (err) {
        (0, response_utils_1.sendError)(res, err.message, 500);
    }
};
exports.getToday = getToday;
//# sourceMappingURL=get-todays-gatepasses.controller.js.map