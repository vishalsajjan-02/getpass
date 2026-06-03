"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.create = void 0;
const create_user_service_1 = require("../service/create-user.service");
const response_utils_1 = require("../../../utils/response.utils");
const create = async (req, res) => {
    try {
        const input = req.body;
        if (!input.name || !input.email || !input.password || !input.role) {
            (0, response_utils_1.sendError)(res, 'name, email, password, and role are required');
            return;
        }
        const user = await (0, create_user_service_1.createUser)(input);
        (0, response_utils_1.sendSuccess)(res, user, 201);
    }
    catch (err) {
        (0, response_utils_1.sendError)(res, err.message);
    }
};
exports.create = create;
//# sourceMappingURL=create-user.controller.js.map