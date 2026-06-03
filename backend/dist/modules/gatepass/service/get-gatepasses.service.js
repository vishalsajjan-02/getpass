"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGatepasses = void 0;
const database_1 = require("../../../config/database");
const gatepass_shared_1 = require("./shared/gatepass.shared");
const getGatepasses = async (userId, role) => {
    const visibility = (0, gatepass_shared_1.buildVisibilityClause)(role, userId, 1);
    const conditions = visibility.clause ? [visibility.clause] : [];
    return (0, gatepass_shared_1.runGatepassQuery)((0, database_1.getDb)(), conditions, visibility.params);
};
exports.getGatepasses = getGatepasses;
//# sourceMappingURL=get-gatepasses.service.js.map