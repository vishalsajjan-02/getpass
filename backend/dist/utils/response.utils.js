"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMessage = exports.sendError = exports.sendSuccess = void 0;
const sendSuccess = (res, data, status = 200) => res.status(status).json({ success: true, data });
exports.sendSuccess = sendSuccess;
const sendError = (res, error, status = 400) => res.status(status).json({ success: false, error });
exports.sendError = sendError;
const sendMessage = (res, message, status = 200) => res.status(status).json({ success: true, message });
exports.sendMessage = sendMessage;
//# sourceMappingURL=response.utils.js.map