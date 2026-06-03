"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLiveEmployeeStatuses = void 0;
const get_live_employee_statuses_service_1 = require("../service/get-live-employee-statuses.service");
const response_utils_1 = require("../../../utils/response.utils");
const getLiveEmployeeStatuses = async (req, res) => {
    try {
        const employeeId = typeof req.query.employeeId === 'string' ? req.query.employeeId : undefined;
        (0, response_utils_1.sendSuccess)(res, await (0, get_live_employee_statuses_service_1.getLiveEmployeeStatuses)(employeeId));
    }
    catch (err) {
        (0, response_utils_1.sendError)(res, err.message, 500);
    }
};
exports.getLiveEmployeeStatuses = getLiveEmployeeStatuses;
//# sourceMappingURL=get-live-employee-statuses.controller.js.map