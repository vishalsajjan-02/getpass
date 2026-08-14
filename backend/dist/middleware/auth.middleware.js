"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = void 0;
const jwt_utils_1 = require("../utils/jwt.utils");
const response_utils_1 = require("../utils/response.utils");
const database_1 = require("../config/database");
const authenticate = async (req, res, next) => {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
        (0, response_utils_1.sendError)(res, 'No token provided', 401);
        return;
    }
    const token = header.slice(7);
    try {
        const payload = (0, jwt_utils_1.verifyToken)(token);
        // Ensure the token still maps to an active user (guards against DB reseed / soft-delete).
        const result = await (0, database_1.getDb)().query(`SELECT u.id, r.name AS role
       FROM users u
       JOIN roles r ON r.id = u.role_id AND r.deleted_at IS NULL
       WHERE u.id = $1 AND u.deleted_at IS NULL`, [payload.userId]);
        const row = result.rows[0];
        if (!row) {
            (0, response_utils_1.sendError)(res, 'Session expired. Please log in again.', 401);
            return;
        }
        req.user = {
            userId: row.id,
            email: payload.email,
            role: row.role,
        };
        next();
    }
    catch {
        (0, response_utils_1.sendError)(res, 'Invalid or expired token', 401);
    }
};
exports.authenticate = authenticate;
//# sourceMappingURL=auth.middleware.js.map