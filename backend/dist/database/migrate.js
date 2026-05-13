"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("../config/database");
(async () => {
    await (0, database_1.initDb)();
    await (0, database_1.closeDb)();
    console.log('✅ Migration complete');
    process.exit(0);
})();
//# sourceMappingURL=migrate.js.map