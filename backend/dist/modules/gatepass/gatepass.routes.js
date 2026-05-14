"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const GatepassController = __importStar(require("./controller"));
const auth_middleware_1 = require("../../middleware/auth.middleware");
const role_middleware_1 = require("../../middleware/role.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.get('/reasons', GatepassController.getReasons);
router.get('/', GatepassController.getAll);
router.get('/today', GatepassController.getToday);
router.get('/search', GatepassController.search);
router.get('/stats', GatepassController.getStats);
router.get('/analytics/lunch/daily', (0, role_middleware_1.requireRole)('admin'), GatepassController.getDailyLunchReport);
router.get('/analytics/lunch/monthly', (0, role_middleware_1.requireRole)('admin'), GatepassController.getMonthlyLunchReport);
router.get('/analytics/lunch/yearly', (0, role_middleware_1.requireRole)('admin'), GatepassController.getYearlyLunchReport);
router.get('/analytics/lunch/live-status', (0, role_middleware_1.requireRole)('admin'), GatepassController.getLiveEmployeeStatuses);
router.get('/:id', GatepassController.getOne);
router.post('/', (0, role_middleware_1.requireRole)('employee', 'guest', 'admin', 'manager'), GatepassController.create);
router.put('/:id/status', (0, role_middleware_1.requireRole)('admin', 'manager', 'gatekeeper', 'employee', 'guest'), GatepassController.updateStatus);
router.delete('/:id', (0, role_middleware_1.requireRole)('admin', 'manager', 'employee', 'guest'), GatepassController.remove);
exports.default = router;
//# sourceMappingURL=gatepass.routes.js.map