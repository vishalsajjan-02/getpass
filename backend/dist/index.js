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
const uploads_1 = require("./utils/uploads");
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
app.use((0, cors_1.default)({ origin: '*', credentials: true }));
app.use(express_1.default.json({ limit: '12mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
app.use('/uploads', express_1.default.static(uploads_1.UPLOADS_ROOT));
app.use('/api', routes_1.default);
app.use(error_middleware_1.notFound);
app.use(error_middleware_1.errorHandler);
const shouldSeedOnBoot = async () => {
    // Force full reseed when explicitly requested.
    if (process.env.FORCE_SEED === '1' || process.env.FORCE_SEED === 'true') {
        return true;
    }
    // Avoid wiping users on every `tsx watch` restart — that invalidates JWTs
    // and breaks gatekeeper Out/In (checked_out_by FK) until re-login.
    const result = await (0, database_1.getDb)().query(`SELECT 1 FROM users WHERE deleted_at IS NULL LIMIT 1`);
    return result.rows.length === 0;
};
(async () => {
    await (0, database_1.initDb)();
    if (await shouldSeedOnBoot()) {
        await (0, seed_1.runSeed)();
    }
    else {
        console.log('\n⏭️  Skipping seed (database already has users). Set FORCE_SEED=1 to reseed.\n');
    }
    (0, socket_1.initSocketServer)(server);
    server.listen(env_1.env.PORT, () => {
        console.log(`\n🚀 Gatepass API running on http://localhost:${env_1.env.PORT}`);
        console.log(`   Environment : ${env_1.env.NODE_ENV}`);
        console.log(`   API prefix  : /api\n`);
    });
})();
exports.default = app;
//# sourceMappingURL=index.js.map