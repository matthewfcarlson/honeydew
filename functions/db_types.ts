import { z } from "zod";
// UUID looks like this: 42598872-8a5b-44c7-a6ca-1be5e0f21518 = 36 characters
// -------------------------------------------------
// ID Types

function endsWithUuid(x:string) : boolean {
    return true;
}

// UserId is U:{UUID}
export const UserIdZ = z.string({
    required_error: "UserId is required",
    invalid_type_error: "UserID must start with UI:"
}).length(38).startsWith("U:", {message: "Must start with U:"}).refine(endsWithUuid, {message: "Must end in UUID"}).brand()

export type UserId = z.infer<typeof UserIdZ>;

export const HouseIdZ = z.string({
    required_error: "HouseID is required",
    invalid_type_error: "HouseID must start with UI:"
}).length(38).startsWith("H:", {message: "Must start with H:"}).refine(endsWithUuid, {message: "Must end in UUID"}).brand()

export type HouseId = z.infer<typeof HouseIdZ>;

export type DbIds = UserId | HouseId;

export interface DbDataObj {
    id: DbIds
}


enum RecipeType {
    PASTA,
    SLOW_COOKER,
    MEAT,
    SOUP,
    VEGGIES,
}

const DbRecipeZ = z.object({
    id: z.string().uuid(),
    url: z.string().min(5),
    picture_url: z.string().min(5).or(z.null()),
    ingredients: z.set(z.string()),
    last_made: z.number().positive(),
    category: z.nativeEnum(RecipeType),
    household: z.string().uuid(),
});
export type DbRecipe = z.infer<typeof DbRecipeZ>;



// -------------------------------------------------
// Data Types

export type UUID = string;
export type RECIPEID = UUID;
export type HOUSEID = UUID;

export const DbUserZ = z.object({
    id: UserIdZ,
    name: z.string(),
    household: HouseIdZ,
    color: z.string().length(7), // css color
    icon: z.string(),
    _recoverykey: z.string(),
    _chat_id: z.string().nullable(),
}).brand()

// stored at U:{UserId}
// TODO: move over to zod
export interface DbUser {
    id: UserId;
    name: string;
    household: HouseId|null;
    color:string; // css color
    icon:string; // fas string
    _recoverykey:string; // a magic key to recovery your account
    _chat_id: string | null;
}
export const DbUserKey = (id: UserId) => `U:${id}`;
export function isDbUser(x: unknown): x is DbUser {
    const y = (x as DbUser);
    if (y.household === undefined) return false;
    if (y.name === undefined) return false;
    if (y._recoverykey === undefined) return false;
    if (y._chat_id === undefined) return false;
    if (y.id === undefined) return false;
    return true;
}

export const DbHouseholdZ = z.object({
    id: HouseIdZ,
    name: z.string(),
    members: z.array(UserIdZ)
}).brand();

export type DbHousehold = z.infer<typeof DbHouseholdZ>;

export interface DbHouseKey {
    id: UUID;
    house: HOUSEID;
    generated_by: UserId;
}
const DbHouseKeyKey = (id: UUID) => `HK:${id}`;
function isDbHouseKey(x: unknown): x is DbHouseKey {
    const y = (x as DbHouseKey);
    if (y.house === undefined) return false;
    if (y.generated_by === undefined) return false;
    if (y.id === undefined) return false;
    return true;
}

