import { Pool } from 'pg';
export declare const initDb: () => Promise<void>;
export declare const getDb: () => Pool;
export declare const closeDb: () => Promise<void>;
export default getDb;
//# sourceMappingURL=database.d.ts.map