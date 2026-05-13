"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRole = void 0;
const response_utils_1 = require("../utils/response.utils");
const requireRole = (...roles) => (req, res, next) => {
    if (!req.user) {
        (0, response_utils_1.sendError)(res, 'Unauthorized', 401);
        return;
    }
    if (!roles.includes(req.user.role)) {
        (0, response_utils_1.sendError)(res, 'Forbidden: insufficient permissions', 403);
        return;
    }
    next();
};
exports.requireRole = requireRole;
//# sourceMappingURL=role.middleware.js.map