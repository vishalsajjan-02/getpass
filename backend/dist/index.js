"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const env_1 = require("./config/env");
const database_1 = require("./config/database");
const seed_1 = require("./database/seed");
const routes_1 = __importDefault(require("./routes"));
const error_middleware_1 = require("./middleware/error.middleware");
const socket_1 = require("./realtime/socket");
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
app.use((0, cors_1.default)({ origin: '*', credentials: true }));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use('/api', routes_1.default);
app.use(error_middleware_1.notFound);
app.use(error_middleware_1.errorHandler);
(async () => {
    await (0, database_1.initDb)();
    await (0, seed_1.runSeed)();
    (0, socket_1.initSocketServer)(server);
    server.listen(env_1.env.PORT, () => {
        console.log(`\n🚀 Gatepass API running on http://localhost:${env_1.env.PORT}`);
        console.log(`   Environment : ${env_1.env.NODE_ENV}`);
        console.log(`   API prefix  : /api\n`);
    });
})();
exports.default = app;
//# sourceMappingURL=index.js.map