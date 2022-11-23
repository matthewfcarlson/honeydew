import { z } from "zod";

// TODO: move over to the database types

// These are the types of the auth routes as they are not covered by trpc
export const AuthSignupResponseZ = z.object({
    user_id: z.string().uuid(),
    recovery_key: z.string().min(10),
    household: z.string().uuid()
}).strict()
export type AuthSignupResponse = z.infer<typeof AuthSignupResponseZ>;

// These are the types of the auth routes as they are not covered by trpc
export const AuthSignupRequestZ = z.object({
    name: z.string().min(2).max(30),
    key: z.string().optional(),
}).strict()
export type AuthSignupRequest = z.infer<typeof AuthSignupRequestZ>;

export const AuthHouseholdMemberZ = z.object({
    name: z.string().min(2),
    userid: z.string(),
    color: z.string().min(7),
    icon: z.string(),
}).strict();
export type AuthHouseholdMember = z.infer<typeof AuthHouseholdMemberZ>;

export const AuthHouseholdZ = z.object({
    id: z.string().uuid(),
    name: z.string().min(2).max(40),
    members: z.array(AuthHouseholdMemberZ)
}).strict();
export type AuthHousehold = z.infer<typeof AuthHouseholdZ>;

export const AuthCheckZ = z.object({
    name: z.string().min(2).max(30),
    household: AuthHouseholdZ,
    id: z.string().uuid(),
    task: z.any(),
    color: z.string().min(7),
    icon: z.string(),
}).strict()
export type AuthCheck = z.infer<typeof AuthCheckZ>;

export const DEVICE_TOKEN = "Device-Token";
export const TEMP_TOKEN = "Temp-Token";
