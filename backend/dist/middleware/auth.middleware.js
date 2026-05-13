"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = void 0;
const jwt_utils_1 = require("../utils/jwt.utils");
const response_utils_1 = require("../utils/response.utils");
const authenticate = (req, res, next) => {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
        (0, response_utils_1.sendError)(res, 'No token provided', 401);
        return;
    }
    const token = header.slice(7);
    try {
        req.user = (0, jwt_utils_1.verifyToken)(token);
        next();
    }
    catch {
        (0, response_utils_1.sendError)(res, 'Invalid or expired token', 401);
    }
};
exports.authenticate = authenticate;
//# sourceMappingURL=auth.middleware.js.map