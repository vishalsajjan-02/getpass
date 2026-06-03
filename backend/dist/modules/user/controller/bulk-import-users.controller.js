"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bulkImport = void 0;
const bulk_import_users_service_1 = require("../service/bulk-import-users.service");
const response_utils_1 = require("../../../utils/response.utils");
const bulkImport = async (req, res) => {
    try {
        const rows = req.body;
        if (!Array.isArray(rows.users) || rows.users.length === 0) {
            (0, response_utils_1.sendError)(res, 'users array is required');
            return;
        }
        (0, response_utils_1.sendSuccess)(res, await (0, bulk_import_users_service_1.bulkImportUsers)(rows.users), 201);
    }
    catch (err) {
        (0, response_utils_1.sendError)(res, err.message);
    }
};
exports.bulkImport = bulkImport;
//# sourceMappingURL=bulk-import-users.controller.js.map