"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = void 0;
const login_service_1 = require("../service/login.service");
const response_utils_1 = require("../../../utils/response.utils");
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            (0, response_utils_1.sendError)(res, 'Email and password are required');
            return;
        }
        (0, response_utils_1.sendSuccess)(res, await (0, login_service_1.loginWithCredentials)(email, password));
    }
    catch (err) {
        (0, response_utils_1.sendError)(res, err.message, 401);
    }
};
exports.login = login;
//# sourceMappingURL=login.controller.js.map