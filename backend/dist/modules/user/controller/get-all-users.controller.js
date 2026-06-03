"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAll = void 0;
const get_all_users_service_1 = require("../service/get-all-users.service");
const response_utils_1 = require("../../../utils/response.utils");
const getAll = async (_req, res) => {
    try {
        (0, response_utils_1.sendSuccess)(res, await (0, get_all_users_service_1.getAllUsers)());
    }
    catch (err) {
        (0, response_utils_1.sendError)(res, err.message, 500);
    }
};
exports.getAll = getAll;
//# sourceMappingURL=get-all-users.controller.js.map