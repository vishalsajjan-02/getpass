"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLunchEmployeeDetailReport = void 0;
const get_lunch_employee_detail_report_service_1 = require("../service/get-lunch-employee-detail-report.service");
const response_utils_1 = require("../../../utils/response.utils");
const getLunchEmployeeDetailReport = async (req, res) => {
    try {
        const startDate = typeof req.query.startDate === 'string' ? req.query.startDate : undefined;
        const endDate = typeof req.query.endDate === 'string' ? req.query.endDate : undefined;
        (0, response_utils_1.sendSuccess)(res, await (0, get_lunch_employee_detail_report_service_1.getLunchEmployeeDetailReport)(req.params.userId, startDate, endDate));
    }
    catch (err) {
        (0, response_utils_1.sendError)(res, err.message, 500);
    }
};
exports.getLunchEmployeeDetailReport = getLunchEmployeeDetailReport;
//# sourceMappingURL=get-lunch-employee-detail-report.controller.js.map