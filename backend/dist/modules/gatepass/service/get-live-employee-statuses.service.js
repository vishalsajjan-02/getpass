"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLiveEmployeeStatuses = void 0;
const database_1 = require("../../../config/database");
const gatepass_shared_1 = require("./shared/gatepass.shared");
const getLiveEmployeeStatuses = async (employeeId) => (0, gatepass_shared_1.getLiveEmployeeStatusesInternal)((0, database_1.getDb)(), employeeId);
exports.getLiveEmployeeStatuses = getLiveEmployeeStatuses;
//# sourceMappingURL=get-live-employee-statuses.service.js.map