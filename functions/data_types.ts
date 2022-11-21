export type UUID = string;
export type USERID = UUID;
export type RECIPEID = UUID;
export type HOUSEID = UUID;

// stored at U:{USERID}
// TODO: move over to zod
export interface DbUser {
    id: USERID;
    name: string;
    household: HOUSEID;
    color:string; // css color
    icon:string; // fas string
    _recoverykey:string; // a magic key to recovery your account
    _chat_id: string | null;
}
export const DbUserKey = (id: USERID) => `U:${id}`;
export function isDbUser(x: unknown): x is DbUser {
    const y = (x as DbUser);
    if (y.household === undefined) return false;
    if (y.name === undefined) return false;
    if (y._recoverykey === undefined) return false;
    if (y._chat_id === undefined) return false;
    if (y.id === undefined) return false;
    return true;
}
