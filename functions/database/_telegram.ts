import { number, z } from "zod";
export interface TelegramAPIResponse {
    ok: boolean;
    result: any;
}
function isTelegramAPIResponse(response: any): response is TelegramAPIResponse {
    if ((response as TelegramAPIResponse).ok === undefined) return false;
    if ((response as TelegramAPIResponse).result === undefined) return false;
    return true;
}

function isTelegramX(x: unknown): x is TelegramMessage {
    const y = (x as TelegramMessage);
    // if (y.id === undefined) return false;
    return true;
}

const TelegramSendMessageParseModeZ = z.union([z.literal("MarkdownV2"), z.literal("HTML")])
type TelegramSendMessageParseMode = z.infer<typeof TelegramSendMessageParseModeZ>;
const TelegramSendMessageZ = z.object({
    chat_id: z.union([z.number(), z.string().startsWith("@")]),
    message_thread_id: z.number().optional(),
    text: z.string().max(4096).min(1),
    parse_mode: TelegramSendMessageParseModeZ.optional(),
    disable_web_page_preview: z.boolean().optional(),
    disable_notification: z.boolean().optional(),
    protect_content: z.boolean().optional(),
    reply_to_message_id: z.number().optional(),
    allow_sending_without_reply: z.boolean().optional(),
    reply_markup: z.any().optional() // todo: make this make sense
});
type TelegramSendMessage = z.infer<typeof TelegramSendMessageZ>;

export interface TelegramCallbackQuery {
    id: string;
    from: TelegramUser;
    message?: TelegramMessage;
    inline_message_id?: string;
    chat_instance: string;
    data?: string;
}
function isTelegramCallbackQuery(x: unknown): x is TelegramCallbackQuery {
    const y = (x as TelegramCallbackQuery);
    if (y.id === undefined) return false;
    if (y.from === undefined) return false;
    if (y.chat_instance === undefined) return false;
    if (!isTelegramUser(y.from)) return false;
    return true;
}

export interface TelegramUser {
    id: number;
    is_bot: boolean;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code?: string;
    is_premium?: boolean;
    added_to_attachment_menu?: true;
    can_join_groups?: boolean;
    can_read_all_group_messages?: boolean;
    supports_inline_queries?: boolean;
}
function isTelegramUser(user: unknown): user is TelegramUser {
    if ((user as TelegramUser).id === undefined) return false;
    if ((user as TelegramUser).is_bot === undefined) return false;
    if ((user as TelegramUser).first_name === undefined) return false;
    return true;
}

//https://core.telegram.org/bots/api#message
export interface TelegramMessage {
    message_id: number;
    from?: TelegramUser;
    sender_chat?: TelegramChat;
    date: number;
    chat: TelegramChat;
    forward_from?: TelegramUser;
    forward_from_message_id?: number;
    reply_to_message?: TelegramMessage;
    via_bot?: TelegramUser;
    edit_date?: number;
    text?: string;
    // TODO finish
}
function isTelegramMessage(x: unknown): x is TelegramMessage {
    const y = (x as TelegramMessage);
    if (y.message_id === undefined) return false;
    if (y.date === undefined) return false;
    if (y.chat === undefined) return false;
    if (y.from !== undefined && !isTelegramUser(y.from)) return false;
    if (y.sender_chat !== undefined && !isTelegramChat(y.sender_chat)) return false;
    if (y.chat !== undefined && !isTelegramChat(y.chat)) return false;
    return true;
}

export interface TelegramChat {
    id: number;
    type: "private" | "group" | "supergroup" | "channel";
    title?: string;
    username?: string;
    first_name?: string;
    last_name?: string;
    photo?: any;
    bio?: string;
    linked_chat_id?: number;
    invite_link?: string;
}

function isTelegramChat(x: unknown): x is TelegramChat {
    const y = (x as TelegramChat);
    if (y.id === undefined) return false;
    if (y.type === undefined) return false;
    return true;
}


interface TelegramUpdateBase {
    update_id: number;
}
export interface TelegramUpdateMessage extends TelegramUpdateBase {
    message: TelegramMessage;
}
export interface TelegramUpdateEditedMessage extends TelegramUpdateBase {
    edited_message: TelegramMessage;
}
export interface TelegramUpdateCallbackQuery extends TelegramUpdateBase {
    callback_query: TelegramCallbackQuery;
}
export interface TelegramUpdateGeneric extends TelegramUpdateBase {
    channel_post: TelegramMessage;
    edited_channel_post: TelegramMessage;
    inline_query: any;
    chosen_inline_result: any;
    chat_member: any;
    chat_join_request: any;
}
export type TelegramUpdate = TelegramUpdateMessage | TelegramUpdateEditedMessage | TelegramUpdateCallbackQuery | TelegramUpdateGeneric;
function isTelegramUpdate(x: unknown): x is TelegramUpdate {
    if ((x as TelegramUpdate).update_id === undefined) return false;
    return true;
}
export function isTelegramUpdateMessage(x: unknown): x is TelegramUpdateMessage {
    if ((x as TelegramUpdateMessage).message === undefined) return false;
    return true;
}
export function isTelegramUpdateCallbackQuery(x: unknown): x is TelegramUpdateCallbackQuery {
    if ((x as TelegramUpdateCallbackQuery).callback_query === undefined) return false;
    return true;
}

export interface TelegramLoginUrl {
    url: string;
    forward_text?: string;
    bot_username?: string;
    request_write_access?: boolean;
}

export interface TelegramInlineKeyboardButton {
    text: string;
    url?: string;
    web_app?: any;
    callback_data?: string; // 1-64 bytes
    login_url?: TelegramLoginUrl;
    switch_inline_query?: string;
}

export type TelegramInlineKeyboardButtonRow = TelegramInlineKeyboardButton[];
export interface TelegramInlineKeyboardMarkup {
    inline_keyboard: TelegramInlineKeyboardButtonRow[];
}

export interface TelegramWebhookInfo {
    url: string;
    has_custom_certificate: boolean;
    pending_update_count: number;
    last_error_date?: string;
    last_error_message?: string;
}
function isTelegramWebhookInfo(x: unknown): x is TelegramWebhookInfo {
    if ((x as TelegramWebhookInfo).url === undefined) return false;
    if ((x as TelegramWebhookInfo).has_custom_certificate === undefined) return false;
    if ((x as TelegramWebhookInfo).pending_update_count === undefined) return false;
    return true;
}

export class TelegramAPI {
    private key: string;

    constructor(key: string) {
        this.key = key;
    }

    protected getAPIUrl(method: string): string {
        return `https://api.telegram.org/bot${this.key}/${method}`
    }

    /**
     * gatherResponse awaits and returns a response body as a string.
     * Use await gatherResponse(..) in an async function to get the response body
     * @param {Response} response
     */
    protected async gatherResponse(response: Response) {
        const { headers } = response;
        const contentType = headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
            return await response.json();
        } else if (contentType.includes('application/text')) {
            return response.text();
        } else if (contentType.includes('text/html')) {
            return response.text();
        } else {
            return response.text();
        }
    }

    protected async request(method: string) {
        const url = this.getAPIUrl(method);
        const init = {
            headers: {
                'content-type': 'text/html;charset=UTF-8',
            },
        };
        const response = await fetch(url, init); 
        const results = await this.gatherResponse(response);
        if (response.status != 200) {
            console.error(`REQUEST ${method}`, response, results);
            return false;
        }
        if (!isTelegramAPIResponse(results)) return false;
        return results;
    }

    protected async requestPost(method: string, data: any) {
        const url = this.getAPIUrl(method);
        const init = {
            method: "post",
            body: JSON.stringify(data),
            headers: {
                'content-type': 'application/json',
            },
        };
        const response = await fetch(url, init);
        const results = await this.gatherResponse(response);
        if (response.status != 200) {
            console.error(`REQUESTPOST ${method}`, response, results);
            return false;
        }
        if (!isTelegramAPIResponse(results)) return false;
        return results;
    }

    public async getMe(): Promise<TelegramUser | false> {
        const results = await this.request('getMe');
        if (results == false) return false;
        if (!isTelegramUser(results.result)) return false;
        return results.result;
    }

    public async getUpdates(offset?: number): Promise<TelegramUpdate[] | false> {
        const results = await this.request('getUpdates');
        if (results == false) return false;
        if (!Array.isArray(results.result)) return false;
        const updates = results.result.filter(isTelegramUpdate);
        return updates;
    }

    public async sendTextMessage(chat_id: string | number, text: string, reply_to_message?: number, reply_markup?: TelegramInlineKeyboardMarkup, parse_mode?: TelegramSendMessageParseMode) {
        const data: TelegramSendMessage = {
            chat_id,
            text,
            reply_to_message_id: reply_to_message,
            reply_markup,
            parse_mode,
        };
        const results = await this.requestPost('sendMessage', data);
        if (results == false) return false;
        if (!isTelegramMessage(results.result)) return false;
        return results.result;
    }

    public async sendPhoto(chat_id: string|number, photo: string, caption?: string, reply_to_message?: number) {
        const data = {
            chat_id,
            photo,
            caption,
            reply_to_message_id: reply_to_message
        };
        const results = await this.requestPost('sendPhoto', data);
        if (results == false) return false;
        if (!isTelegramMessage(results.result)) return false;
        return results.result;
    }

    public async clearMessageReplyMarkup(chat_id:number|string, message_id: number) {
        const data = {
            chat_id,
            message_id,
            reply_markup: {inline_keyboard: []},
        };
        const results = await this.requestPost('editMessageReplyMarkup', data);
        if (results == false) return false;
        return true;
    }
    public async deleteMessage(chat_id:number|string, message_id: number) {
        const data = {
            chat_id,
            message_id
        };
        const results = await this.requestPost('deleteMessage', data);
        if (results == false) return false;
        return true;
    }

    public async setWebhook(url: string, secret_token?: string) {
        const data = {
            url,
            secret_token
        };
        const results = await this.requestPost('setWebhook', data);
        if (results == false) return false;
        return true;
    }

    public async deleteWebhook() {
        const results = await this.request('deleteWebhook');
        if (results == false) return false;
        return true;
    }

    public async getWebhookInfo() {
        const results = await this.request('getWebhookInfo');
        if (results == false) return false;
        if (!isTelegramWebhookInfo(results.result)) return false;
        return results.result;
    }
}

interface MockedTelegramRequestGet {
    type: 'GET';
    method: string;
}
interface MockedTelegramRequestPost {
    type: 'POST';
    method: string;
    data: any;
}
export type MockedTelegramRequest = MockedTelegramRequestGet | MockedTelegramRequestPost;
type MockedTelegramListener = ((x:MockedTelegramRequest)=>Promise<Response>);
export class MockedTelegramAPI extends TelegramAPI {
    private _request_listener: MockedTelegramListener|null = null;
    public registerListener(listener:MockedTelegramListener) {
        this._request_listener = listener;
    }

    protected getAPIUrl(method: string): string {
        return `http://localhost/bot/${method}`
    }

    protected async request(method: string) {
        const request:MockedTelegramRequest = {
            type: "GET",
            method,
        }
        if (this._request_listener == null) {
            console.error("No listener registered");
            return false;
        }

        const response = await this._request_listener(request);
        const results = await this.gatherResponse(response);
        if (response.status != 200) {
            console.error(`REQUEST ${method}`, response, results);
            return false;
        }
        if (!isTelegramAPIResponse(results)) return false;
        return results;
    }

    protected async requestPost(method: string, data: any) {
        const request:MockedTelegramRequest = {
            type: "POST",
            method,
            data,
        }
        if (this._request_listener == null) {
            console.error("No listener registered");
            return false;
        }
        const response = await this._request_listener(request);
        const results = await this.gatherResponse(response);
        if (response.status != 200) {
            console.error(`REQUEST ${method}`, response, results);
            return false;
        }
        if (!isTelegramAPIResponse(results)) return false;
        return results;
    }
}