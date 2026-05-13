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
exports.getMe = exports.guestLogin = exports.login = void 0;
const AuthService = __importStar(require("../service"));
const response_utils_1 = require("../../../utils/response.utils");
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            (0, response_utils_1.sendError)(res, 'Email and password are required');
            return;
        }
        const result = await AuthService.loginWithCredentials(email, password);
        (0, response_utils_1.sendSuccess)(res, result);
    }
    catch (err) {
        (0, response_utils_1.sendError)(res, err.message, 401);
    }
};
exports.login = login;
const guestLogin = async (req, res) => {
    try {
        const { code } = req.body;
        if (!code) {
            (0, response_utils_1.sendError)(res, 'Guest code is required');
            return;
        }
        const result = await AuthService.guestLogin(code);
        (0, response_utils_1.sendSuccess)(res, result);
    }
    catch (err) {
        (0, response_utils_1.sendError)(res, err.message, 401);
    }
};
exports.guestLogin = guestLogin;
const getMe = async (req, res) => {
    try {
        const user = await AuthService.getMe(req.user.userId);
        (0, response_utils_1.sendSuccess)(res, user);
    }
    catch (err) {
        (0, response_utils_1.sendError)(res, err.message, 404);
    }
};
exports.getMe = getMe;
//# sourceMappingURL=auth.controller.js.map