"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_routes_1 = __importDefault(require("../modules/auth/auth.routes"));
const user_routes_1 = __importDefault(require("../modules/user/user.routes"));
const gatepass_routes_1 = __importDefault(require("../modules/gatepass/gatepass.routes"));
const router = (0, express_1.Router)();
router.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));
router.use('/auth', auth_routes_1.default);
router.use('/users', user_routes_1.default);
router.use('/gatepasses', gatepass_routes_1.default);
exports.default = router;
//# sourceMappingURL=index.js.map