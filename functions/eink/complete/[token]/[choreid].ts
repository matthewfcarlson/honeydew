import { HoneydewPagesFunction } from "../../../types";
import Database from "../../../database/_db";
import { ChoreIdz, EinkTokenKVKeyZ } from "../../../db_types";
import { ResponseJsonAccessDenied, ResponseJsonBadRequest, ResponseJsonServerError, checkRateLimit } from "../../../_utils";

export const onRequestGet: HoneydewPagesFunction = async function (context) {
    const token = context.params.token;
    const choreid = context.params.choreid;
    if (token == null || Array.isArray(token)) return ResponseJsonBadRequest("Invalid token");
    if (choreid == null || Array.isArray(choreid)) return ResponseJsonBadRequest("Invalid chore ID");

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

    const chore_id = ChoreIdz.safeParse(choreid);
    if (!chore_id.success) return ResponseJsonBadRequest("Invalid chore ID format");

    try {
        // Verify chore belongs to this household
        const chore = await db.ChoreGet(chore_id.data);
        if (chore == null || chore.household_id != payload.house_id) {
            return ResponseJsonBadRequest("Chore not found in this household");
        }

        const result = await db.ChoreComplete(chore_id.data, payload.user_id);

        return new Response(JSON.stringify({
            success: result.success,
            streak: result.streak,
            chore_name: chore.name,
        }), {
            headers: {
                "Content-Type": "application/json",
                "Cache-Control": "no-store",
            },
        });
    } catch (err) {
        return ResponseJsonServerError(err);
    }
}
