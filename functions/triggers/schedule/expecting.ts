import { HoneydewPagesFunction } from "../../types";
import Database from "../../database/_db";
import { TelegramAPI } from "../../database/_telegram";
import { getRandomValueFromArray } from "../../_utils";


const week_size_facts = new Map<number, string>([
    [4, "a poppy seed",],
    [5, "a sesame seed",],
    [6, "a lentil",],
    [7, "a blueberry",],
    [8, "an app icon on your phone"],
    [9, "a grape",],
    [10, "a mini cocktail sausage"],
    [11, "a ping pong ball"],
    [12, "a lime",],
    [13, "a peapod",],
    [14, "a lemon",],
    [15, "an apple",],
    [16, "an eclair",],
    [17, "a turnip",],
    [18, "a bell pepper",],
    [19, "a pint of ice cream",],
    [20, "a banana",],
    [21, "a bottle of sriracha",],
    [22, "a papaya",],
    [23, "a grapefruit",],
    [24, "an ear of corn",],
    [25, "a rutabaga",],
    [26, "a bottle of fancy soda"],
    [27, "a cauliflower",],
    [28, "an eggplant",],
    [29, "a giant banana split"],
    [30, "a garden gnome",],
    [31, "a tub of movie po]pcorn"],
    [32, "a honeydew melon"],
    [33, "a pineapple",],
    [34, "a mid century mod]ern hanging lamp"],
    [35, "a picnic basket",],
    [36, "a throw pillow",],
    [37, "a large zucchini"],
    [38, "a toolbox",],
    [39, "a beach ball",],
    [40, "a small pumpkin",],
    [41, "a large pumpkin",],
]);

const week_fun_fact = new Map<number, string>([
    [4, "It is referred to as a blastocyst",],
    [5, "It looks like a tadpole, with a heart and circulatory system developing",],
    [6, "it now has kidneys, a liver, and lungs",],
    [7, "Mouth and ears are starting to form, dark spots are be where the eyes will be",],
    [8, "Currently it has webbed hands and feet but fingers and toes are starting to form",],
    [9, "Small taste buds are starting to form",],
    [10, "Teeth are starting to form under the gums",],
    [11, "Fingerprints are starting to form and blood tests can confirm the gender",],
    [12, "All organs are now basically formed",],
    [13, "Bones are hardening. For you stretching can really help with the aches and pains",],
    [14, "The risk of miscarriage decreases significantly and red blood cells are starting to form",],
    [15, "The eyes are moving away from the sides of the head and towards the front",],
    [16, "The urinary track and circulation system are working",],
    [17, "You may start to feel movement and hair/nails are starting to form",],
    [18, "The digestive system is starting to work",],
    [19, "You might now start to feel kicks and vernix (wax) is starting to form on the skin",],
    [20, "Muscles are starting to form and the fetus is starting to move around more",],
    [21, "You're halfway there! The fetus starts reacting to food you eat",],
    [22, "The fetus can now respond to external stimulus but eyes are still fused shut",],
    [23, "Use a squatty potty and avoid straining while pooping to avoid hemorrhoids",],
    [24, "Congrats on making it to viability!",],
    [25, "Gaining fat and developing the lungs this week",],
    [26, "The startle/moro reflex is starting to develop and the intestines are starting to grow. The fetus may also start a sleep cycle",],
    [27, "Neurons are forming and the lungs are developing, causing hiccups",],
    [28, "The eyes are blinking and moving while still growing bones and muscles",],
    [29, "The fine hair all over the skin is almost at its peak",],
    [30, "From this point on, the fetus will gain about half a pound each week",],
    [31, "The fetus is too big to stretch out and now is forced into the fetal position",],
    [32, "All major organs are fully functioning except for the lungs",],
    [33, "Less elbow room means less movement but the fetus can still kick and roll around",],
    [34, "Weight gain often slows or plateaus at this point, the vernix thickens",],
    [35, "The mucus plug can drop out at any time, signaling labor is near",],
    [36, "The rapid growth is coming to an end and the fetus is starting to drop into the pelvis",],
    [37, "Antibodies are transferred over the umbilical cord to help the fetus fight infection",],
    [38, "Connections are forming in the brain to sleep and swallow",],
    [39, "Most of the hair (lanugo) is gone and the fetus is now covered in vernix",],
    [40, "The baby once born will be graded on several factors: muscle tone, pulse, grimace response, appearance, and respiration",],
    [42, "Babies aren't overdue until after this point"],
]);

const week_symptoms = new Map<number, string>([
    [4, "increased fatigue, mild cramping, or spotting",],
    [5, "nausea, constipation, food aversion, or heightened sense of smell",],
    [6, "hormonal changes, dizziness, bloating, or gas",],
    [7, "frequent urination, cramps, weird cravings",],
    [8, "strange dreams, skin issues, bloating, headaches",],
    [9, "breast tenderness, fatigue, vomiting",],
    [10, "constipation, mood changes",],
    [11, "more of what you've been experiences",],
    [12, "bloating, headaches, discharge",],
    [13, "Increased breast size, constipation, headaches, swollen/bleeding gums, ligament pain",],
    [14, "Cramps and charlie horses at night",],
    [15, "Decreased nausea/vomiting but more bloating. You may notice a visible bump",],
    [16, "Achy back and indigestion",],
    [17, "Energy dips and mild cramping",],
    [18, "Hip/back aches, fetal movement, and some energy may come back",],
    [19, "Swelling of feet and ankles, ligament pain",],
    [20, "Stretch marks, leg cramps, swollen gums, and back pain",],
    [21, "Varicose veins, acne, low back pain, Braxton hicks",],
    [22, "Shortness of breath, backaches, swollen feet",],
    [23, "Nosebleeds, hemorrhoids, tiredness, trouble sleeping",],
    [24, "Tiredness and frequent urination",],
    [25, "Insomnia, itchy skin, and heartburn",],
    [26, "Outie belly button, weight gain, swelling, stretch marks, heartburn",],
    [27, "Swollen feet, weight gain",],
    [28, "Swelling, breast growth, back pain, and Braxton hicks contractions",],
    [29, "Fatigue, constipation, insomnia, and heartburn",],
    [31, "Lower back and hip pain, tingling/numbness due to sciatic nerve pressure",],
    [32, "Urine leakage, breathlessness, and appetite loss",],
    [33, "Braxton Hicks contractions start in earnest",],
    [37, "You might see some spotting during sex and it will likely be more sensitive",],
]);

const intro_message = [
    "Congrats, you made it to",
    "You're now on",
    "Woohoo, you did it. It is now",
    "Welcome to",
    "Tada! You're now on",
    "You've made it to",
    "Beautiful! It is now",
    "It's really flow by! As of today, you're on",
    "As of today, you're on"
]

// a and b are javascript Date objects
function dateDiffInDays(a: Date, b: Date) {
    const _MS_PER_DAY = 1000 * 60 * 60 * 24;
    // Discard the time and time-zone information.
    const utc1 = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
    const utc2 = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());

    return Math.floor((utc2 - utc1) / _MS_PER_DAY);
}

export const TriggerExpecting = async function (db: Database) {
    // First request all the households that have expecting set to a non-null value]
    const households = await db.HouseGetHousesExpecting();
    if (households == null) return null;
    const today = new Date();
    const household_promises = households.map(async (x) => {
        // First we calculate how long it has been
        if (x.expecting == null) return null;
        const expecting = new Date(x.expecting);
        const days = dateDiffInDays(expecting, today);
        const week = (days / 7) + 1;
        //if it's more than 42, we don't care anymore
        if (week > 42) return null;
        // Check if we've already messaged you this week
        if (await db.HouseExpectingHasBeenMessaged(x.id)) return "Already messaged, bailing";
        const week_round = Math.floor(week);
        let symptoms_msg = "";
        let fun_fact_msg = "";
        let size_msg = "";
        if (week_symptoms.has(week_round)) {
            const symptoms = week_symptoms.get(week_round) ;
            symptoms_msg = `\nYou may be experiencing these symptoms: ${symptoms}`;
        }
        if (week_fun_fact.has(week_round)) {
            fun_fact_msg = week_fun_fact.get(week_round)||"";
        }
        if (week_size_facts.has(week_round)) {
            const size = week_size_facts.get(week_round);
            size_msg = `\nThe fetus is the size of a ${size}`;
        }

        const intro = getRandomValueFromArray(intro_message);
        const message = `${intro} week ${week_round}:\n ${fun_fact_msg}${symptoms_msg}${size_msg}`;
        await db.HouseholdTelegramMessageAllMembers(x.id, message);
        if (!await db.HouseExpectingMarkMessaged(x.id)) return "Failed to mark messaged";
        return message;
    });
    const results = await Promise.allSettled(household_promises);
    return {
        results,
        households
    };
}

/* istanbul ignore next */
export const onRequestGet: HoneydewPagesFunction = async function (context) {
    // we don't have a middleware for this so create a DB
    const db = new Database(context.env.HONEYDEW, new TelegramAPI(context.env.TELEGRAM), context.env.HONEYDEWSQL);

    // first get the current date that we generated this
    // TODO: we could use KV to make sure we aren't running too often?
    const date = new Date();

    const raw_results = await TriggerExpecting(db);
    if (raw_results == null) return new Response("No households expecting", { status: 200 });
    const data = (context.env.PRODUCTION == "true") ?
        {
            timestamp: date,
            count: 0
        } :
        {
            timestamp: date,
            count: 0,
            // users: raw_results.users,
            results: raw_results.results,
            houses: raw_results.households,
        };
    return new Response(JSON.stringify(data), { headers: { "Content-Type": "application/javascript" } },)
}