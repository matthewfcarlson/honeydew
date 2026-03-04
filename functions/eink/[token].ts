import { HoneydewPagesFunction } from "../types";
import Database from "../database/_db";
import { EinkTokenKVKeyZ } from "../db_types";
import { ResponseJsonAccessDenied, ResponseJsonBadRequest, ResponseJsonServerError, getJulianDate, checkRateLimit } from "../_utils";

export const onRequestGet: HoneydewPagesFunction = async function (context) {
    const token = context.params.token;
    if (token == null || Array.isArray(token)) return ResponseJsonBadRequest("Invalid token");

    const ip = context.request.headers.get('CF-Connecting-IP') || 'unknown';
    const allowed = await checkRateLimit(context.env.HONEYDEW, `rl:eink:${ip}`, 30, 300);
    if (!allowed) {
        return new Response(JSON.stringify({ error: "Too many requests" }), {
            status: 429,
            headers: { "Content-Type": "application/json", "Retry-After": "60" },
        });
    }

    const db = context.data.db as Database;
    const kv_key = EinkTokenKVKeyZ.safeParse("EK:" + token);
    if (!kv_key.success) return ResponseJsonBadRequest("Invalid token format");
    const payload = await db.EinkTokenLookup(kv_key.data);
    if (payload == null) return ResponseJsonAccessDenied("Invalid or expired token");

    try {
        const today = getJulianDate();
        const household = await db.HouseholdGetExtended(payload.house_id);
        if (household == null) return ResponseJsonBadRequest("Household not found");

        const allChores = await db.ChoreGetAll(payload.house_id);

        // Sort chores by overdue-ness (most overdue first)
        const sortedChores = allChores.sort((a, b) => {
            const a_score = Math.abs(a.lastDone - today) / (a.frequency + 1);
            const b_score = Math.abs(b.lastDone - today) / (b.frequency + 1);
            return b_score - a_score;
        });

        // Build member summaries with chore completion status
        const members = household.members.map((m) => ({
            name: m.name,
            color: m.color,
            icon: m.icon,
            streak: m.current_streak,
            chore: m.current_chore ? {
                id: m.current_chore.id,
                name: m.current_chore.name,
                completed: false,
                complete_url: `/eink/complete/${token}/${m.current_chore.id}`,
            } : null,
        }));

        // Build chore list with completion URLs
        const chores = sortedChores.map((c) => {
            const days_overdue = Math.floor(today - c.lastDone) - c.frequency;
            return {
                id: c.id,
                name: c.name,
                frequency: c.frequency,
                days_since_done: Math.floor(today - c.lastDone),
                days_overdue: Math.max(0, days_overdue),
                assigned_to: c.doneBy,
                last_done_by: c.lastDoneBy,
                complete_url: `/eink/complete/${token}/${c.id}`,
            };
        });

        // Current household project task
        const current_task = household.current_task ? {
            id: household.current_task.id,
            description: household.current_task.description,
            project: household.current_project ? {
                id: household.current_project.id,
                name: household.current_project.description,
            } : null,
            completed: household.current_task.completed != null,
        } : null;

        const response_data = {
            household: household.name,
            timestamp: new Date().toISOString(),
            members,
            chores,
            current_task,
        };

        return new Response(JSON.stringify(response_data), {
            headers: {
                "Content-Type": "application/json",
                "Cache-Control": "no-cache",
            },
        });
    } catch (err) {
        return ResponseJsonServerError(err);
    }
}
