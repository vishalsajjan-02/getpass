"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMeHandler = void 0;
const get_me_service_1 = require("../service/get-me.service");
const response_utils_1 = require("../../../utils/response.utils");
const getMeHandler = async (req, res) => {
    try {
        (0, response_utils_1.sendSuccess)(res, await (0, get_me_service_1.getMe)(req.user.userId));
    }
    catch (err) {
        (0, response_utils_1.sendError)(res, err.message, 404);
    }
};
exports.getMeHandler = getMeHandler;
//# sourceMappingURL=get-me.controller.js.map