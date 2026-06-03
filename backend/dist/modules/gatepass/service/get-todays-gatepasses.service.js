"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTodaysGatepasses = void 0;
const database_1 = require("../../../config/database");
const gatepass_shared_1 = require("./shared/gatepass.shared");
const getTodaysGatepasses = async (userId, role) => {
    const today = new Date().toISOString().slice(0, 10);
    const conditions = ['g.date = $1'];
    const params = [today];
    const visibility = (0, gatepass_shared_1.buildVisibilityClause)(role, userId, params.length + 1);
    if (visibility.clause) {
        conditions.push(visibility.clause);
        params.push(...visibility.params);
    }
    return (0, gatepass_shared_1.runGatepassQuery)((0, database_1.getDb)(), conditions, params);
};
exports.getTodaysGatepasses = getTodaysGatepasses;
//# sourceMappingURL=get-todays-gatepasses.service.js.map