"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_routes_1 = __importDefault(require("../modules/auth/auth.routes"));
const user_routes_1 = __importDefault(require("../modules/user/user.routes"));
const gatepass_routes_1 = __importDefault(require("../modules/gatepass/gatepass.routes"));
const user_in_out_time_routes_1 = __importDefault(require("../modules/userInOutTime/user-in-out-time.routes"));
const leave_routes_1 = __importDefault(require("../modules/leave/leave.routes"));
const company_holiday_routes_1 = __importDefault(require("../modules/companyHoliday/company-holiday.routes"));
const router = (0, express_1.Router)();
router.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));
router.use('/auth', auth_routes_1.default);
router.use('/users', user_routes_1.default);
router.use('/gatepasses', gatepass_routes_1.default);
router.use('/user-in-out-time', user_in_out_time_routes_1.default);
router.use('/leaves', leave_routes_1.default);
router.use('/company-holidays', company_holiday_routes_1.default);
exports.default = router;
//# sourceMappingURL=index.js.map