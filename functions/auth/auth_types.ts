import { z } from "zod";

// These are the types of the auth routes as they are not covered by trpc
export const AuthSignupResponseZ = z.object({
    user_id: z.string().uuid(),
    recovery_key: z.string().min(10),
    household: z.string().uuid()
})
export type AuthSignupResponse = z.infer<typeof AuthSignupResponseZ>;

// These are the types of the auth routes as they are not covered by trpc
export const AuthSignupRequestZ = z.object({
    name: z.string().min(2),
    key: z.string().optional(),
})
export type AuthSignupRequest = z.infer<typeof AuthSignupRequestZ>;

export const AuthHouseholdMemberZ = z.object({
    name: z.string().min(2),
    userid: z.string(),
    color: z.string().min(7),
    icon: z.string(),
});
export type AuthHouseholdMember = z.infer<typeof AuthHouseholdMemberZ>;

export const AuthHouseholdZ = z.object({
    id: z.string().uuid(),
    name: z.string().min(2),
    members: z.array(AuthHouseholdMemberZ)
});
export type AuthHousehold = z.infer<typeof AuthHouseholdZ>;

export const AuthCheckZ = z.object({
    name: z.string().min(2),
    household: AuthHouseholdZ,
    id: z.string().uuid(),
    task: z.any()
})
export type AuthCheck = z.infer<typeof AuthCheckZ>;

export const DEVICE_TOKEN = "Device-Token";
export const TEMP_TOKEN = "Temp-Token";