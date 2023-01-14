import { z } from "zod";
// UUID looks like this: 42598872-8a5b-44c7-a6ca-1be5e0f21518 = 36 characters
// -------------------------------------------------
// ID Types

function endsWithUuid(x: string): boolean {
    return true;
}

// UserId is U:{UUID}
export const UserIdZ = z.string({
    required_error: "UserId is required",
    invalid_type_error: "UserID must start with U:"
}).length(38).startsWith("U:", { message: "Must start with U:" }).refine(endsWithUuid, { message: "Must end in UUID" }).brand<"UserId">()

export type UserId = z.infer<typeof UserIdZ>;

export const HouseIdZ = z.string({
    required_error: "HouseID is required",
    invalid_type_error: "HouseID must start with H:"
}).length(38).startsWith("H:", { message: "Must start with H:" }).refine(endsWithUuid, { message: "Must end in UUID" }).brand<"HouseId">()
export type HouseId = z.infer<typeof HouseIdZ>;

export const HouseKeyIdz = z.string().length(39).startsWith("HK:", { message: "Must start with HK:" }).refine(endsWithUuid).brand<"HousekeyId">();
export type HouseKeyId = z.infer<typeof HouseKeyIdz>;

export const ProjectIdZ = z.string({
    required_error: "ProjectID is required",
    invalid_type_error: "ProjectID must start with P:"
}).length(38).startsWith("P:", { message: "Must start with P:" }).refine(endsWithUuid, { message: "Must end in UUID" }).brand<"ProjectId">()
export type ProjectId = z.infer<typeof ProjectIdZ>;

export const TaskIdZ = z.string({
    required_error: "TaskID is required",
    invalid_type_error: "TaskID must start with P:"
}).length(38).startsWith("T:", { message: "Must start with T:" }).refine(endsWithUuid, { message: "Must end in UUID" }).brand<"TaskId">()
export type TaskId = z.infer<typeof TaskIdZ>;

export const RecipeIdZ = z.string({
    required_error: "RecipeId is required",
    invalid_type_error: "RecipeId must start with R:"
}).length(38).startsWith("R:", { message: "Must start with R:" }).refine(endsWithUuid, { message: "Must end in UUID" }).brand<"RecipeId">()
export type RecipeId = z.infer<typeof RecipeIdZ>;

export const ChoreIdz = z.string({
    required_error: "ChoreId is required",
    invalid_type_error: "ChoreId must start with R:"
}).length(38).startsWith("C:", { message: "Must start with C:" }).refine(endsWithUuid, { message: "Must end in UUID" }).brand<"ChoreId">()
export type ChoreId = z.infer<typeof ChoreIdz>;


export type DbIds = UserId | HouseId | HouseKeyId | ProjectId | TaskId | RecipeId | ChoreId;

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

// const DbRecipeZ = z.object({
//     id: z.string().uuid(),
//     url: z.string().min(5),
//     picture_url: z.string().min(5).or(z.null()),
//     ingredients: z.set(z.string()),
//     last_made: z.number().positive(),
//     category: z.nativeEnum(RecipeType),
//     household: z.string().uuid(),
// });
// export type DbRecipe = z.infer<typeof DbRecipeZ>;



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
    _chat_id: z.number().nullable(),
})
// TODO: should chat ID be an array that's chained together as needed?
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

export const DbRecipeZRaw = z.object({
    id: RecipeIdZ,
    name: z.string().max(255),
    url: z.string().max(512),
    image: z.string().max(512),
    totalTime: z.number().nonnegative(), // the time in minutes
});
export const DbRecipeZ = DbRecipeZRaw.brand<"Recipe">();
export type DbRecipeRaw = z.infer<typeof DbRecipeZRaw>;
export type DbRecipe = z.infer<typeof DbRecipeZ>;

export const DbCardBoxZRaw = z.object({
    recipe_id: RecipeIdZ,
    household_id: HouseIdZ,
    lastMade: z.number().nonnegative().nullable(), // stored as julian day numbers
    favorite: z.number().nonnegative(),
    meal_prep: z.number().nonnegative(), // meal prep 0-1
});
export const DbCardBoxZ = DbCardBoxZRaw.brand<"Cardbox">();
export type DbCardBoxRaw = z.infer<typeof DbCardBoxZRaw>;
export type DbCardBox = z.infer<typeof DbCardBoxZ>;

export const DbCardBoxRecipeZ = DbCardBoxZRaw.extend({
    recipe: DbRecipeZ
}).brand<"DbCardBoxRecipeZ">();
export type DbCardBoxRecipe = z.infer<typeof DbCardBoxRecipeZ>;

export const DbChoreZRaw = z.object({
    id: ChoreIdz,
    household_id: HouseIdZ,
    name: z.string().max(255),
    frequency: z.number().positive(),
    lastDone: z.number().nonnegative(),  // stored as julian day numbers
    waitUntil: z.number().nonnegative().nullable(), // stored as julian day numbers
});
export const DbChoreZ = DbChoreZRaw.brand<"Chore">();
export type DbChoreRaw = z.infer<typeof DbChoreZRaw>;
export type DbChore = z.infer<typeof DbChoreZ>;

