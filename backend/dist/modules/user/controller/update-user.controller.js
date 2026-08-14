"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.update = void 0;
const update_user_service_1 = require("../service/update-user.service");
const response_utils_1 = require("../../../utils/response.utils");
const update = async (req, res) => {
    try {
        const { id } = req.params;
        const isElevatedRole = req.user?.role === 'admin' || req.user?.role === 'manager';
        if (!isElevatedRole && req.user?.userId !== id) {
            (0, response_utils_1.sendError)(res, 'Forbidden', 403);
            return;
        }
        const input = req.body;
        if (!isElevatedRole)
            delete input.role;
        // Punch permission is managed only via /users/:id/punch-permission
        delete input.can_self_punch;
        (0, response_utils_1.sendSuccess)(res, await (0, update_user_service_1.updateUser)(id, input));
    }
    catch (err) {
        (0, response_utils_1.sendError)(res, err.message, 404);
    }
};
exports.update = update;
//# sourceMappingURL=update-user.controller.js.map