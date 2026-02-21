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

export const HouseExtendedKVIdZ = z.string({
    required_error: "HouseExtendedId is required",
    invalid_type_error: "HouseExtendedId must start with E:H:"
}).length(40).startsWith("E:H:", { message: "Must start with E:H:" }).refine(endsWithUuid, { message: "Must end in UUID" }).brand<"HouseExtendedKVId">()
export type HouseExtendedKVId = z.infer<typeof HouseExtendedKVIdZ>;

export const HouseExtendedKVIdFromHouseId = (id: HouseId): HouseExtendedKVId => {
    return HouseExtendedKVIdZ.parse("E:" + id);
}

export const HouseKeyKVKeyZ = z.string().length(39).startsWith("HK:", { message: "Must start with HK:" }).refine(endsWithUuid).brand<"HouseKeyKVKey">();
export type HouseKeyKVKey = z.infer<typeof HouseKeyKVKeyZ>;

// Used to keep track of which houses have gotten their expecting notification
export const HouseExpectingKVKeyZ = z.string().length(39).startsWith("EH:", { message: "Must start with EH:" }).refine(endsWithUuid).brand<"HouseExpectingKVKey">();
export type HouseExpectingKVKey = z.infer<typeof HouseExpectingKVKeyZ>;

export const ProjectIdZ = z.string({
    required_error: "ProjectID is required",
    invalid_type_error: "ProjectID must start with P:"
}).length(38).startsWith("P:", { message: "Must start with P:" }).refine(endsWithUuid, { message: "Must end in UUID" }).brand<"ProjectId">()
export type ProjectId = z.infer<typeof ProjectIdZ>;

export const TaskIdZ = z.string({
    required_error: "TaskID is required",
    invalid_type_error: "TaskID must start with T:"
}).length(38).startsWith("T:", { message: "Must start with T:" }).refine(endsWithUuid, { message: "Must end in UUID" }).brand<"TaskId">()
export type TaskId = z.infer<typeof TaskIdZ>;

export const RecipeIdZ = z.string({
    required_error: "RecipeId is required",
    invalid_type_error: "RecipeId must start with R:"
}).length(38).startsWith("R:", { message: "Must start with R:" }).refine(endsWithUuid, { message: "Must end in UUID" }).brand<"RecipeId">()
export type RecipeId = z.infer<typeof RecipeIdZ>;

export const ChoreIdz = z.string({
    required_error: "ChoreId is required",
    invalid_type_error: "ChoreId must start with C:"
}).length(38).startsWith("C:", { message: "Must start with C:" }).refine(endsWithUuid, { message: "Must end in UUID" }).brand<"ChoreId">()
export type ChoreId = z.infer<typeof ChoreIdz>;

// ClothingId is CL:{UUID}
export const ClothingIdZ = z.string({
    required_error: "ClothingId is required",
    invalid_type_error: "ClothingId must start with CL:"
}).length(39).startsWith("CL:", { message: "Must start with CL:" }).refine(endsWithUuid, { message: "Must end in UUID" }).brand<"ClothingId">()
export type ClothingId = z.infer<typeof ClothingIdZ>;

// OutfitId is O:{UUID}
export const OutfitIdZ = z.string({
    required_error: "OutfitId is required",
    invalid_type_error: "OutfitId must start with O:"
}).length(38).startsWith("O:", { message: "Must start with O:" }).refine(endsWithUuid, { message: "Must end in UUID" }).brand<"OutfitId">()
export type OutfitId = z.infer<typeof OutfitIdZ>;

export const DbMagicKeyZ = z.string().length(50).brand<"MagicKey">();
export type DbMagicKey = z.infer<typeof DbMagicKeyZ>;
export const MagicKVKeyZ = z.string().length(53).startsWith("MK:").brand<"MagicKVKey">();
export type MagicKVKey = z.infer<typeof MagicKVKeyZ>;

export const UserChoreCacheKVKeyZ = z.string().length(41).startsWith("CC:U:").brand<"UserChoreCacheKVKey">();
export type UserChoreCacheKVKey = z.infer<typeof UserChoreCacheKVKeyZ>;

export const HouseholdTaskAssignmentKVKeyZ = z.string().length(41).startsWith("TA:H:").brand<"HouseholdTaskAssignmentKVKey">();
export type HouseholdTaskAssignmentKVKey = z.infer<typeof HouseholdTaskAssignmentKVKeyZ>;


export const TelegramCallbackKVKeyZ = z.string().length(39).startsWith("TC:").brand<"TelegramCallbackKVKey">();
export type TelegramCallbackKVKey = z.infer<typeof TelegramCallbackKVKeyZ>;

const TelegramCallbackKVPayloadBaseZ = z.object({
    user_id: UserIdZ
})
const TelegramCallbackKVPayloadCompleteChoreZ = TelegramCallbackKVPayloadBaseZ.extend({
    type: z.literal("COMPLETE_CHORE"),
    chore_id: ChoreIdz,
});
const TelegramCallbackKVPayloadAnotherChoreZ = TelegramCallbackKVPayloadBaseZ.extend({
    type: z.literal("ANOTHER_CHORE"),
});
export const TelegramCallbackKVPayloadZ = z.discriminatedUnion("type", [
    TelegramCallbackKVPayloadCompleteChoreZ,
    TelegramCallbackKVPayloadAnotherChoreZ,
]);

export type TelegramCallbackKVPayload = z.infer<typeof TelegramCallbackKVPayloadZ>;

export type DbIds = UserId | HouseId | ProjectId | TaskId | RecipeId | ChoreId | ClothingId | OutfitId;
export type KVIds = CacheIds | UserChoreCacheKVKey | MagicKVKey | HouseKeyKVKey | TelegramCallbackKVKey | HouseholdTaskAssignmentKVKey | HouseExpectingKVKey;
export type CacheIds = UserId | HouseId | HouseExtendedKVId;

export interface KVDataObj {
    id: KVIds
}

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
    last_active_date: z.number().nullable(), // Julian day number of last chore completion
    current_streak: z.number().nonnegative(), // Current consecutive days streak
    outfit_reminders: z.number().nonnegative(), // 1 = opted in, 0 = opted out of outfit reminders
})
export const DbUserZ = DbUserZRaw.brand<"User">()
export type DbUser = z.infer<typeof DbUserZ>;
export type DbUserRaw = z.infer<typeof DbUserZRaw>;


export const DbHouseholdRawZ = z.object({
    id: HouseIdZ,
    name: z.string().max(255),
    members: z.array(UserIdZ),
    expecting: z.string().max(25).nullable(),
})
export const DbHouseholdZ = DbHouseholdRawZ.brand<"Household">();
export type DbHouseholdRaw = z.infer<typeof DbHouseholdRawZ>;
export type DbHousehold = z.infer<typeof DbHouseholdZ>;

const DbDateRawZ = z.string().refine((arg) =>
    arg.match(
        /^(\d{4})-(\d{2})-(\d{2})$/
    ));
export const DbDateZ = DbDateRawZ.brand<"DbDate">();
export type DbDateRaw = z.infer<typeof DbDateRawZ>;
export type DbDate = z.infer<typeof DbDateZ>;

export const DbHouseAutoAssignmentRawZ = z.object({
    house_id: HouseIdZ,
    choreAssignHour: z.number().lt(24).nonnegative(), // the hour that chores should be assigned automatically
    choreLastAssignTime: z.number().nonnegative(), // the last time chores were automatically assigned
    outfitHour: z.number().lt(24).nonnegative().nullable(), // the hour that outfit suggestions should be sent, null means disabled
    outfitLastAssignTime: z.number().nonnegative().nullable(), // the last time outfit suggestions were sent
});
export const DbHouseAutoAssignmentZ = DbHouseAutoAssignmentRawZ.brand<"House Auto Assign">();
export type DbHouseAutoAssignmentRaw = z.infer<typeof DbHouseAutoAssignmentRawZ>;
export type DbHouseAutoAssignment = z.infer<typeof DbHouseAutoAssignmentZ>;


export const DbHouseKeyZRaw = z.object({
    id: HouseKeyKVKeyZ,
    house: HouseIdZ,
    generated_by: UserIdZ
});
export const DbHouseKeyZ = DbHouseKeyZRaw.brand<"Housekey">();
export type DbHouseKeyRaw = z.infer<typeof DbHouseKeyZRaw>;
export type DbHouseKey = z.infer<typeof DbHouseKeyZ>;

export const DbProjectZRaw = z.object({
    id: ProjectIdZ,
    description: z.string().min(1).max(255),
    household: HouseIdZ,
});
export const DbProjectZ = DbProjectZRaw.brand<"Project">();
export type DbProjectRaw = z.infer<typeof DbProjectZRaw>;
export type DbProject = z.infer<typeof DbProjectZ>;
export interface AugmentedDbProject extends DbProject {
    total_subtasks: number,
    ready_subtasks: number,
    done_subtasks: number,
}

export const DbTaskZRaw = z.object({
    id: TaskIdZ,
    household: HouseIdZ,
    description: z.string().min(1).max(255),
    project: ProjectIdZ.nullable(),
    completed: z.number().nonnegative().nullable(), // null or julian day number
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
    doneBy: UserIdZ.nullable(), // the user assigned to always do this chore
    lastTimeAssigned: z.number().nonnegative().nullable(), // julian day when it was last assigned
    lastDoneBy: UserIdZ.nullable(), // the user who last completed this chore
});
export const DbChoreZ = DbChoreZRaw.brand<"Chore">();
export type DbChoreRaw = z.infer<typeof DbChoreZRaw>;
export type DbChore = z.infer<typeof DbChoreZ>;
export const DbHouseholdExtendedMemberRawZ = z.object({
    name: DbUserZRaw.shape.name,
    userid: UserIdZ,
    color: DbUserZRaw.shape.color,
    icon: DbUserZRaw.shape.icon,
    current_chore: DbChoreZ.nullable(),
});
export type DbHouseholdExtendedMemberRaw = z.infer<typeof DbHouseholdExtendedMemberRawZ>;
export const DbHouseholdExtendedRawZ = z.object({
    id: DbHouseholdRawZ.shape.id,
    name: DbHouseholdRawZ.shape.name,
    current_task: DbTaskZ.nullable(),
    current_project: DbProjectZ.nullable(),
    members: z.array(DbHouseholdExtendedMemberRawZ),
    choreAssignHour: z.number().lt(24).nonnegative().nullable(),
    outfitHour: z.number().lt(24).nonnegative().nullable(),
});
export const DbHouseholdExtendedZ = DbHouseholdExtendedRawZ.brand<"DbHouseholdExtended">()
export type DbHouseholdExtendedRaw = z.infer<typeof DbHouseholdExtendedRawZ>;
export type DbHouseholdExtended = z.infer<typeof DbHouseholdExtendedZ>;

// -------------------------------------------------
// Clothing Types

export const DbClothingZRaw = z.object({
    id: ClothingIdZ,
    household_id: HouseIdZ,
    name: z.string().max(255),
    category: z.string().max(100),         // e.g. "Tops", "Bottoms", "Outerwear"
    subcategory: z.string().max(100),      // e.g. "T-Shirt", "Jeans", "Jacket"
    brand: z.string().max(255),
    color: z.string().max(100),
    size: z.string().max(50),
    image_url: z.string().max(1024),       // URL to clothing image
    tags: z.string().max(1024),            // comma-separated tags (e.g. "casual,summer,work")
    wear_count: z.number().nonnegative(),  // how many times the item has been worn
    is_clean: z.number().nonnegative(),    // 1 = clean, 0 = dirty (SQLite boolean)
    added_by: UserIdZ,
    created_at: z.number().nonnegative(),  // julian day number when added
});
export const DbClothingZ = DbClothingZRaw.brand<"Clothing">();
export type DbClothingRaw = z.infer<typeof DbClothingZRaw>;
export type DbClothing = z.infer<typeof DbClothingZ>;

// -------------------------------------------------
// Outfit Types

export const DbOutfitZRaw = z.object({
    id: OutfitIdZ,
    household_id: HouseIdZ,
    name: z.string().max(255),
    image_url: z.string().max(1024),           // preview image URL
    clothing_items: z.string().max(2048),      // comma-separated ClothingIds
    added_by: UserIdZ,
    created_at: z.number().nonnegative(),      // julian day number when added
});
export const DbOutfitZ = DbOutfitZRaw.brand<"Outfit">();
export type DbOutfitRaw = z.infer<typeof DbOutfitZRaw>;
export type DbOutfit = z.infer<typeof DbOutfitZ>;
