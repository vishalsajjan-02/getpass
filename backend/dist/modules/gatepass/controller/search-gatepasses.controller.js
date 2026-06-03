"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.search = void 0;
const get_gatepasses_service_1 = require("../service/get-gatepasses.service");
const search_gatepasses_service_1 = require("../service/search-gatepasses.service");
const response_utils_1 = require("../../../utils/response.utils");
const search = async (req, res) => {
    try {
        const { userId, role } = req.user;
        const query = String(req.query.q || '');
        if (!query.trim()) {
            (0, response_utils_1.sendSuccess)(res, await (0, get_gatepasses_service_1.getGatepasses)(userId, role));
            return;
        }
        (0, response_utils_1.sendSuccess)(res, await (0, search_gatepasses_service_1.searchGatepasses)(query, userId, role));
    }
    catch (err) {
        (0, response_utils_1.sendError)(res, err.message, 500);
    }
};
exports.search = search;
//# sourceMappingURL=search-gatepasses.controller.js.map