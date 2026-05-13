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
exports.remove = exports.updateStatus = exports.create = exports.getOne = exports.getReasons = exports.getStats = exports.search = exports.getToday = exports.getAll = void 0;
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
        const filterUserId = role === 'employee' || role === 'guest' ? userId : undefined;
        (0, response_utils_1.sendSuccess)(res, await GatepassService.getGatepassStats(filterUserId));
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
const getOne = async (req, res) => {
    try {
        (0, response_utils_1.sendSuccess)(res, await GatepassService.getGatepassById(req.params.id));
    }
    catch (err) {
        (0, response_utils_1.sendError)(res, err.message, 404);
    }
};
exports.getOne = getOne;
const create = async (req, res) => {
    try {
        const input = req.body;
        if (!input.purpose) {
            (0, response_utils_1.sendError)(res, 'purpose is required');
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
        if ((input.status === 'approved' || input.status === 'rejected') && !input.approved_by) {
            input.approved_by = req.user.userId;
        }
        (0, response_utils_1.sendSuccess)(res, await GatepassService.updateGatepassStatus(req.params.id, input));
    }
    catch (err) {
        (0, response_utils_1.sendError)(res, err.message);
    }
};
exports.updateStatus = updateStatus;
const remove = async (req, res) => {
    try {
        await GatepassService.deleteGatepass(req.params.id);
        (0, response_utils_1.sendMessage)(res, 'Gatepass deleted successfully');
    }
    catch (err) {
        (0, response_utils_1.sendError)(res, err.message, 404);
    }
};
exports.remove = remove;
//# sourceMappingURL=gatepass.controller.js.map