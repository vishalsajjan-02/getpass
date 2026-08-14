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
const UserInOutTimeController = __importStar(require("./controller"));
const auth_middleware_1 = require("../../middleware/auth.middleware");
const role_middleware_1 = require("../../middleware/role.middleware");
const uploads_1 = require("../../utils/uploads");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.get('/me', UserInOutTimeController.getMyAttendance);
router.get('/attendance', (0, role_middleware_1.requireRole)('admin'), UserInOutTimeController.getAttendanceReport);
// Admins and gatekeepers manage the full daily report. Managers use /me + own history only.
router.get('/', (0, role_middleware_1.requireRole)('admin', 'gatekeeper'), UserInOutTimeController.getDailyReport);
router.post('/check-in', (0, role_middleware_1.requireRole)('admin', 'gatekeeper', 'manager', 'employee'), uploads_1.punchUpload.single('photo'), UserInOutTimeController.checkIn);
router.post('/check-out', (0, role_middleware_1.requireRole)('admin', 'gatekeeper', 'manager', 'employee'), uploads_1.punchUpload.single('photo'), UserInOutTimeController.checkOut);
router.post('/punch', (0, role_middleware_1.requireRole)('admin', 'gatekeeper'), uploads_1.punchUpload.single('photo'), UserInOutTimeController.autoPunch);
router.put('/day-status', (0, role_middleware_1.requireRole)('admin'), UserInOutTimeController.setDayAttendanceStatus);
router.get('/users/:userId', (0, role_middleware_1.requireRole)('admin', 'manager', 'gatekeeper', 'employee'), UserInOutTimeController.getUserHistory);
exports.default = router;
//# sourceMappingURL=user-in-out-time.routes.js.map