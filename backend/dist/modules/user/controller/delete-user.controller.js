"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.remove = void 0;
const delete_user_service_1 = require("../service/delete-user.service");
const response_utils_1 = require("../../../utils/response.utils");
const remove = async (req, res) => {
    try {
        await (0, delete_user_service_1.deleteUser)(req.params.id);
        (0, response_utils_1.sendMessage)(res, 'User deleted successfully');
    }
    catch (err) {
        (0, response_utils_1.sendError)(res, err.message, 404);
    }
};
exports.remove = remove;
//# sourceMappingURL=delete-user.controller.js.map