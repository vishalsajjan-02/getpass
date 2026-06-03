"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOne = void 0;
const get_user_by_id_service_1 = require("../service/get-user-by-id.service");
const response_utils_1 = require("../../../utils/response.utils");
const getOne = async (req, res) => {
    try {
        (0, response_utils_1.sendSuccess)(res, await (0, get_user_by_id_service_1.getUserById)(req.params.id));
    }
    catch (err) {
        (0, response_utils_1.sendError)(res, err.message, 404);
    }
};
exports.getOne = getOne;
//# sourceMappingURL=get-user-by-id.controller.js.map