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

export const HouseKeyIdz = z.string().length(39).startsWith("HK:", {message: "Must start with HK:"}).refine(endsWithUuid).brand();
export type HouseKeyId = z.infer<typeof HouseKeyIdz>;

export type DbIds = UserId | HouseId | HouseKeyId;

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

export const DbUserZRaw = z.object({
    id: UserIdZ,
    name: z.string().max(255),
    household: HouseIdZ,
    color: z.string().length(7), // css color
    icon: z.string().max(40),
    _created_at: z.string().optional(),
    _recoverykey: z.string().max(255),
    _chat_id: z.string().nullable(),
})
export const DbUserZ = DbUserZRaw.brand()
export type DbUser = z.infer<typeof DbUserZ>;
export type DbUserRaw = z.infer<typeof DbUserZRaw>;


export const DbHouseholdZ = z.object({
    id: HouseIdZ,
    name: z.string().max(255),
    members: z.array(UserIdZ)
}).brand();

export type DbHousehold = z.infer<typeof DbHouseholdZ>;

export const DbHouseKeyZRaw = z.object({
    id: HouseKeyIdz,
    house: HouseIdZ,
    generated_by: UserIdZ
});
export const DbHouseKeyZ = DbHouseKeyZRaw.brand();
export type DbHouseKeyRaw = z.infer<typeof DbHouseKeyZRaw>;
export type DbHouseKey = z.infer<typeof DbHouseKeyZ>;
