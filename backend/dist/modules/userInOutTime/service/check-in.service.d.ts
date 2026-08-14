import type { PunchVia, UserInOutTime } from '../../../types';
import type { PunchLocation } from './punch-location';
export type PunchActor = {
    actorUserId: string;
    actorRole: string;
};
/** self = employee/manager punched their own account; gatekeeper = desk/gatekeeper (or admin) punch. */
export declare const resolvePunchVia: (actor: PunchActor, targetUserId: string) => PunchVia;
export declare const checkIn: (userId: string, photoRelativePath: string | undefined, actor: PunchActor, punchLocation?: PunchLocation) => Promise<UserInOutTime>;
//# sourceMappingURL=check-in.service.d.ts.map