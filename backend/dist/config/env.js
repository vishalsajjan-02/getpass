"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config({ path: path_1.default.join(__dirname, '../../.env') });
const parseDurationMinutes = (value, fallback) => {
    const match = value?.match(/(\d+)/);
    const minutes = match ? parseInt(match[1], 10) : fallback;
    return Number.isFinite(minutes) && minutes > 0 ? minutes : fallback;
};
exports.env = {
    PORT: parseInt(process.env.PORT || '3001', 10),
    NODE_ENV: process.env.NODE_ENV || 'development',
    JWT_SECRET: process.env.JWT_SECRET || 'fallback-secret-change-in-production',
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
    GUEST_CODES: (process.env.GUEST_CODES || 'GUEST123').split(',').map(c => c.trim()),
    DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/gatepass_nexus',
    TIME_FOR_LUNCH: process.env.timeforlunch || '30min',
    TIME_FOR_LUNCH_MINUTES: parseDurationMinutes(process.env.timeforlunch, 30),
    FACE_SERVICE_URL: process.env.FACE_SERVICE_URL || 'http://127.0.0.1:8091',
    FACE_MATCH_THRESHOLD: parseFloat(process.env.FACE_MATCH_THRESHOLD || '0.35'),
};
//# sourceMappingURL=env.js.map