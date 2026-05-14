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
exports.remove = exports.updateStatus = exports.create = exports.getOne = exports.getLiveEmployeeStatuses = exports.getLunchEmployeeDetailReport = exports.getYearlyLunchReport = exports.getMonthlyLunchReport = exports.getLunchAnalyticsRangeReport = exports.getDailyLunchReport = exports.getReasons = exports.getStats = exports.search = exports.getToday = exports.getAll = void 0;
const GatepassService = __importStar(require("../service"));
const response_utils_1 = require("../../../utils/response.utils");
const getAll = async (req, res) => {
    try {
        const { userId, role } = req.user;
        (0, response_utils_1.sendSuccess)(res, await GatepassService.getGatepasses(userId, role));
    }
    catch (err) {
        (0, response_utils_1.sendError)(res, err.message, 500);
    }
};
exports.getAll = getAll;
const getToday = async (req, res) => {
    try {
        const { userId, role } = req.user;
        (0, response_utils_1.sendSuccess)(res, await GatepassService.getTodaysGatepasses(userId, role));
    }
    catch (err) {
        (0, response_utils_1.sendError)(res, err.message, 500);
    }
};
exports.getToday = getToday;
const search = async (req, res) => {
    try {
        const { userId, role } = req.user;
        const query = String(req.query.q || '');
        if (!query.trim()) {
            (0, response_utils_1.sendSuccess)(res, await GatepassService.getGatepasses(userId, role));
            return;
        }
        (0, response_utils_1.sendSuccess)(res, await GatepassService.searchGatepasses(query, userId, role));
    }
    catch (err) {
        (0, response_utils_1.sendError)(res, err.message, 500);
    }
};
exports.search = search;
const getStats = async (req, res) => {
    try {
        const { userId, role } = req.user;
        (0, response_utils_1.sendSuccess)(res, await GatepassService.getGatepassStats(userId, role));
    }
    catch (err) {
        (0, response_utils_1.sendError)(res, err.message, 500);
    }
};
exports.getStats = getStats;
const getReasons = async (_req, res) => {
    try {
        (0, response_utils_1.sendSuccess)(res, await GatepassService.getGatepassReasons());
    }
    catch (err) {
        (0, response_utils_1.sendError)(res, err.message, 500);
    }
};
exports.getReasons = getReasons;
const getDailyLunchReport = async (req, res) => {
    try {
        const date = typeof req.query.date === 'string' ? req.query.date : undefined;
        const employeeId = typeof req.query.employeeId === 'string' ? req.query.employeeId : undefined;
        (0, response_utils_1.sendSuccess)(res, await GatepassService.getDailyLunchReport(date, employeeId));
    }
    catch (err) {
        (0, response_utils_1.sendError)(res, err.message, 500);
    }
};
exports.getDailyLunchReport = getDailyLunchReport;
const getLunchAnalyticsRangeReport = async (req, res) => {
    try {
        const startDate = typeof req.query.startDate === 'string' ? req.query.startDate : undefined;
        const endDate = typeof req.query.endDate === 'string' ? req.query.endDate : undefined;
        const employeeId = typeof req.query.employeeId === 'string' ? req.query.employeeId : undefined;
        (0, response_utils_1.sendSuccess)(res, await GatepassService.getLunchAnalyticsRangeReport(startDate, endDate, employeeId));
    }
    catch (err) {
        (0, response_utils_1.sendError)(res, err.message, 500);
    }
};
exports.getLunchAnalyticsRangeReport = getLunchAnalyticsRangeReport;
const getMonthlyLunchReport = async (req, res) => {
    try {
        const month = typeof req.query.month === 'string' ? req.query.month : undefined;
        const employeeId = typeof req.query.employeeId === 'string' ? req.query.employeeId : undefined;
        (0, response_utils_1.sendSuccess)(res, await GatepassService.getMonthlyLunchReport(month, employeeId));
    }
    catch (err) {
        (0, response_utils_1.sendError)(res, err.message, 500);
    }
};
exports.getMonthlyLunchReport = getMonthlyLunchReport;
const getYearlyLunchReport = async (req, res) => {
    try {
        const year = typeof req.query.year === 'string' ? req.query.year : undefined;
        const employeeId = typeof req.query.employeeId === 'string' ? req.query.employeeId : undefined;
        (0, response_utils_1.sendSuccess)(res, await GatepassService.getYearlyLunchReport(year, employeeId));
    }
    catch (err) {
        (0, response_utils_1.sendError)(res, err.message, 500);
    }
};
exports.getYearlyLunchReport = getYearlyLunchReport;
const getLunchEmployeeDetailReport = async (req, res) => {
    try {
        const startDate = typeof req.query.startDate === 'string' ? req.query.startDate : undefined;
        const endDate = typeof req.query.endDate === 'string' ? req.query.endDate : undefined;
        (0, response_utils_1.sendSuccess)(res, await GatepassService.getLunchEmployeeDetailReport(req.params.userId, startDate, endDate));
    }
    catch (err) {
        (0, response_utils_1.sendError)(res, err.message, 500);
    }
};
exports.getLunchEmployeeDetailReport = getLunchEmployeeDetailReport;
const getLiveEmployeeStatuses = async (req, res) => {
    try {
        const employeeId = typeof req.query.employeeId === 'string' ? req.query.employeeId : undefined;
        (0, response_utils_1.sendSuccess)(res, await GatepassService.getLiveEmployeeStatuses(employeeId));
    }
    catch (err) {
        (0, response_utils_1.sendError)(res, err.message, 500);
    }
};
exports.getLiveEmployeeStatuses = getLiveEmployeeStatuses;
const getOne = async (req, res) => {
    try {
        const { userId, role } = req.user;
        (0, response_utils_1.sendSuccess)(res, await GatepassService.getGatepassById(req.params.id, userId, role));
    }
    catch (err) {
        (0, response_utils_1.sendError)(res, err.message, 404);
    }
};
exports.getOne = getOne;
const create = async (req, res) => {
    try {
        const input = req.body;
        if (!input.reason_id && !input.reason_name) {
            (0, response_utils_1.sendError)(res, 'reason_id is required');
            return;
        }
        const gatepass = await GatepassService.createGatepass(req.user.userId, input);
        (0, response_utils_1.sendSuccess)(res, gatepass, 201);
    }
    catch (err) {
        (0, response_utils_1.sendError)(res, err.message);
    }
};
exports.create = create;
const updateStatus = async (req, res) => {
    try {
        const input = req.body;
        if (!input.status) {
            (0, response_utils_1.sendError)(res, 'status is required');
            return;
        }
        (0, response_utils_1.sendSuccess)(res, await GatepassService.updateGatepassStatus(req.params.id, input, req.user.userId, req.user.role));
    }
    catch (err) {
        (0, response_utils_1.sendError)(res, err.message);
    }
};
exports.updateStatus = updateStatus;
const remove = async (req, res) => {
    try {
        await GatepassService.deleteGatepass(req.params.id, req.user.userId, req.user.role);
        (0, response_utils_1.sendMessage)(res, 'Gatepass deleted successfully');
    }
    catch (err) {
        (0, response_utils_1.sendError)(res, err.message, 404);
    }
};
exports.remove = remove;
//# sourceMappingURL=gatepass.controller.js.map