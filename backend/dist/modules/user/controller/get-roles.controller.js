"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRolesHandler = void 0;
const get_roles_service_1 = require("../service/get-roles.service");
const response_utils_1 = require("../../../utils/response.utils");
const getRolesHandler = async (_req, res) => {
    try {
        (0, response_utils_1.sendSuccess)(res, await (0, get_roles_service_1.getRoles)());
    }
    catch (err) {
        (0, response_utils_1.sendError)(res, err.message, 500);
    }
};
exports.getRolesHandler = getRolesHandler;
//# sourceMappingURL=get-roles.controller.js.map