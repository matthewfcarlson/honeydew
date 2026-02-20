import { z } from "zod";
import { DbHouseholdExtendedZ, DbTaskZ, HouseIdZ, UserIdZ } from "../db_types";

// TODO: move over to the database types

// These are the types of the auth routes as they are not covered by trpc
export const AuthSignupResponseZ = z.object({
    user_id: UserIdZ,
    recovery_key: z.string().min(10),
    household: HouseIdZ,
}).strict()
export type AuthSignupResponse = z.infer<typeof AuthSignupResponseZ>;

// These are the types of the auth routes as they are not covered by trpc
export const AuthSignupRequestZ = z.object({
    name: z.string().min(2).max(30),
    key: z.string().optional(),
    turnstile: z.string().optional(),
}).strict()
export type AuthSignupRequest = z.infer<typeof AuthSignupRequestZ>;


export const AuthCheckZ = z.object({
    name: z.string().min(2).max(30),
    household: DbHouseholdExtendedZ,
    id: UserIdZ,
    task: z.any(),
    color: z.string().min(7),
    icon: z.string(),
    outfit_reminders: z.number().nonnegative(),
}).strict()
export type AuthCheck = z.infer<typeof AuthCheckZ>;

export const DEVICE_TOKEN = "Device-Token";
export const TEMP_TOKEN = "Temp-Token";
