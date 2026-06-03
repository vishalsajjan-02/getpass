"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.guestLoginHandler = void 0;
const guest_login_service_1 = require("../service/guest-login.service");
const response_utils_1 = require("../../../utils/response.utils");
const guestLoginHandler = async (req, res) => {
    try {
        const { code } = req.body;
        if (!code) {
            (0, response_utils_1.sendError)(res, 'Guest code is required');
            return;
        }
        (0, response_utils_1.sendSuccess)(res, await (0, guest_login_service_1.guestLogin)(code));
    }
    catch (err) {
        (0, response_utils_1.sendError)(res, err.message, 401);
    }
};
exports.guestLoginHandler = guestLoginHandler;
//# sourceMappingURL=guest-login.controller.js.map