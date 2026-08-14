import type { UserInOutTime } from '../../../types';
import { type PunchActor } from './check-in.service';
import type { PunchLocation } from './punch-location';
export declare const checkOut: (userId: string, photoRelativePath: string | undefined, actor: PunchActor, punchLocation?: PunchLocation) => Promise<UserInOutTime>;
//# sourceMappingURL=check-out.service.d.ts.map