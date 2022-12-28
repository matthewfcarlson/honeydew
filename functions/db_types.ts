import { string, z } from "zod";
// UUID looks like this: 42598872-8a5b-44c7-a6ca-1be5e0f21518 = 36 characters
// -------------------------------------------------
// ID Types

function endsWithUuid(x:string) : boolean {
    return true;
}

// UserId is U:{UUID}
export const UserIdZ = z.string({
    required_error: "UserId is required",
    invalid_type_error: "UserID must start with U:"
}).length(38).startsWith("U:", {message: "Must start with U:"}).refine(endsWithUuid, {message: "Must end in UUID"}).brand()

export type UserId = z.infer<typeof UserIdZ>;

export const HouseIdZ = z.string({
    required_error: "HouseID is required",
    invalid_type_error: "HouseID must start with H:"
}).length(38).startsWith("H:", {message: "Must start with H:"}).refine(endsWithUuid, {message: "Must end in UUID"}).brand()
export type HouseId = z.infer<typeof HouseIdZ>;

export const HouseKeyIdz = z.string().length(39).startsWith("HK:", {message: "Must start with HK:"}).refine(endsWithUuid).brand();
export type HouseKeyId = z.infer<typeof HouseKeyIdz>;

export const ProjectIdZ = z.string({
    required_error: "ProjectID is required",
    invalid_type_error: "ProjectID must start with P:"
}).length(38).startsWith("P:", {message: "Must start with P:"}).refine(endsWithUuid, {message: "Must end in UUID"}).brand()
export type ProjectId = z.infer<typeof ProjectIdZ>;

export const TaskIdZ = z.string({
    required_error: "TaskID is required",
    invalid_type_error: "TaskID must start with P:"
}).length(38).startsWith("T:", {message: "Must start with T:"}).refine(endsWithUuid, {message: "Must end in UUID"}).brand()
export type TaskId = z.infer<typeof ProjectIdZ>;


export type DbIds = UserId | HouseId | HouseKeyId | ProjectId | TaskId;

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
export const DbUserZ = DbUserZRaw.brand<"User">()
export type DbUser = z.infer<typeof DbUserZ>;
export type DbUserRaw = z.infer<typeof DbUserZRaw>;


export const DbHouseholdRawZ = z.object({
    id: HouseIdZ,
    name: z.string().max(255),
    members: z.array(UserIdZ)
})
export const DbHouseholdZ = DbHouseholdRawZ.brand<"Household">();
export type DbHouseholdRaw = z.infer<typeof DbHouseholdRawZ>;
export type DbHousehold = z.infer<typeof DbHouseholdZ>;

export const DbHouseKeyZRaw = z.object({
    id: HouseKeyIdz,
    house: HouseIdZ,
    generated_by: UserIdZ
});
export const DbHouseKeyZ = DbHouseKeyZRaw.brand<"Housekey">();
export type DbHouseKeyRaw = z.infer<typeof DbHouseKeyZRaw>;
export type DbHouseKey = z.infer<typeof DbHouseKeyZ>;

export const DbProjectZRaw = z.object({
    id: ProjectIdZ,
    description: z.string().max(255),
    household: HouseIdZ,
});
export const DbProjectZ = DbProjectZRaw.brand<"Project">();
export type DbProjectRaw = z.infer<typeof DbProjectZRaw>;
export type DbProject = z.infer<typeof DbProjectZ>;


export const DbTaskZRaw = z.object({
    id: TaskIdZ,
    household: HouseIdZ,
    description: z.string().max(255),
    project: ProjectIdZ.nullable(),
    completed: z.boolean(),
    added_by: UserIdZ,
    requirement1: z.nullable(TaskIdZ),
    requirement2: z.nullable(TaskIdZ),
});
export const DbTaskZ = DbTaskZRaw.brand<"Task">();
export type DbTaskRaw = z.infer<typeof DbTaskZRaw>;
export type DbTask = z.infer<typeof DbTaskZ>;
