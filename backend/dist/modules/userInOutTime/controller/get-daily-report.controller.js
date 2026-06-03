"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDailyReportHandler = void 0;
const get_daily_report_service_1 = require("../service/get-daily-report.service");
const response_utils_1 = require("../../../utils/response.utils");
const getDailyReportHandler = async (req, res) => {
    try {
        const date = typeof req.query.date === 'string' ? req.query.date : undefined;
        (0, response_utils_1.sendSuccess)(res, await (0, get_daily_report_service_1.getDailyReport)(date));
    }
    catch (err) {
        (0, response_utils_1.sendError)(res, err.message, 400);
    }
};
exports.getDailyReportHandler = getDailyReportHandler;
//# sourceMappingURL=get-daily-report.controller.js.map