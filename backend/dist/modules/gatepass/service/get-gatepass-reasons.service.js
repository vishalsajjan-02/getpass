"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGatepassReasons = void 0;
const database_1 = require("../../../config/database");
const getGatepassReasons = async () => {
    const result = await (0, database_1.getDb)().query(`SELECT id, name
     FROM gatepass_reasons
     ORDER BY CASE LOWER(name)
       WHEN 'lunch' THEN 1
       WHEN 'out' THEN 2
       ELSE 3
     END, name`);
    return result.rows;
};
exports.getGatepassReasons = getGatepassReasons;
//# sourceMappingURL=get-gatepass-reasons.service.js.map