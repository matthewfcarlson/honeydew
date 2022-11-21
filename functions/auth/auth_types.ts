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