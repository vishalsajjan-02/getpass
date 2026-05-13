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
exports.remove = exports.update = exports.create = exports.getOne = exports.getRoles = exports.getAll = void 0;
const UserService = __importStar(require("../service"));
const response_utils_1 = require("../../../utils/response.utils");
const getAll = async (_req, res) => {
    try {
        (0, response_utils_1.sendSuccess)(res, await UserService.getAllUsers());
    }
    catch (err) {
        (0, response_utils_1.sendError)(res, err.message, 500);
    }
};
exports.getAll = getAll;
const getRoles = async (_req, res) => {
    try {
        (0, response_utils_1.sendSuccess)(res, await UserService.getRoles());
    }
    catch (err) {
        (0, response_utils_1.sendError)(res, err.message, 500);
    }
};
exports.getRoles = getRoles;
const getOne = async (req, res) => {
    try {
        (0, response_utils_1.sendSuccess)(res, await UserService.getUserById(req.params.id));
    }
    catch (err) {
        (0, response_utils_1.sendError)(res, err.message, 404);
    }
};
exports.getOne = getOne;
const create = async (req, res) => {
    try {
        const input = req.body;
        if (!input.name || !input.email || !input.password || !input.role) {
            (0, response_utils_1.sendError)(res, 'name, email, password, and role are required');
            return;
        }
        const user = await UserService.createUser(input);
        (0, response_utils_1.sendSuccess)(res, user, 201);
    }
    catch (err) {
        (0, response_utils_1.sendError)(res, err.message);
    }
};
exports.create = create;
const update = async (req, res) => {
    try {
        const { id } = req.params;
        const isElevatedRole = req.user?.role === 'admin' || req.user?.role === 'manager';
        if (!isElevatedRole && req.user?.userId !== id) {
            (0, response_utils_1.sendError)(res, 'Forbidden', 403);
            return;
        }
        const input = req.body;
        if (!isElevatedRole)
            delete input.role;
        (0, response_utils_1.sendSuccess)(res, await UserService.updateUser(id, input));
    }
    catch (err) {
        (0, response_utils_1.sendError)(res, err.message, 404);
    }
};
exports.update = update;
const remove = async (req, res) => {
    try {
        await UserService.deleteUser(req.params.id);
        (0, response_utils_1.sendMessage)(res, 'User deleted successfully');
    }
    catch (err) {
        (0, response_utils_1.sendError)(res, err.message, 404);
    }
};
exports.remove = remove;
//# sourceMappingURL=user.controller.js.map