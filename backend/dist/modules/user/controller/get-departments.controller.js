"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDepartmentsHandler = void 0;
const get_departments_service_1 = require("../service/get-departments.service");
const response_utils_1 = require("../../../utils/response.utils");
const getDepartmentsHandler = async (_req, res) => {
    try {
        (0, response_utils_1.sendSuccess)(res, await (0, get_departments_service_1.getDepartments)());
    }
    catch (err) {
        (0, response_utils_1.sendError)(res, err.message, 500);
    }
};
exports.getDepartmentsHandler = getDepartmentsHandler;
//# sourceMappingURL=get-departments.controller.js.map