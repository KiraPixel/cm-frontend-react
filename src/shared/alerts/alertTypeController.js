import { api } from "../api/client";

let cachedTypes = null;
let cachedAt = 0;
let pendingPromise = null;

const CACHE_TTL_MS = 5 * 60 * 1000;
const NO_VALUE = "—";

const normalizeTypesPayload = (payload) => {
    if (Array.isArray(payload)) return payload;
    if (payload?.status === "success" && Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.data)) return payload.data;
    return [];
};

const normalizeAlertType = (item) => ({
    alert_un: String(item?.alert_un || ""),
    localization: String(item?.localization || item?.alert_un || ""),
    criticality: item?.criticality ?? null,
    category: String(item?.category || ""),
});

const normalizeTypeKey = (type) => {
    const value = String(type || "").trim();
    if (value === "no_docs_cord" || value === "no_docs_cords") return "no_docs_cords";
    return value || "other";
};

export const buildAlertTypeLookup = (types) => {
    const lookup = {};
    (Array.isArray(types) ? types : []).forEach((type) => {
        if (!type?.alert_un) return;

        const key = String(type.alert_un);
        lookup[key] = type;

        // Backward compatibility for inconsistent API keys
        if (key === "no_docs_cord") lookup.no_docs_cords = type;
        if (key === "no_docs_cords") lookup.no_docs_cord = type;
    });
    return lookup;
};

export const parseAlertDateToUnixSeconds = (raw) => {
    if (raw == null || raw === "") return 0;

    if (typeof raw === "number") {
        if (!Number.isFinite(raw)) return 0;
        return raw > 1e12 ? Math.floor(raw / 1000) : Math.floor(raw);
    }

    const str = String(raw).trim();
    if (!str) return 0;

    const numeric = Number(str);
    if (Number.isFinite(numeric)) {
        return numeric > 1e12 ? Math.floor(numeric / 1000) : Math.floor(numeric);
    }

    const parsedMs = Date.parse(str);
    if (Number.isNaN(parsedMs)) return 0;
    return Math.floor(parsedMs / 1000);
};

export const formatAlertDate = (raw) => {
    const ts = parseAlertDateToUnixSeconds(raw);
    if (!ts) return NO_VALUE;
    return new Date(ts * 1000).toLocaleString("ru-RU");
};

export const normalizeAlert = (item) => {
    const dateRaw = item?.date ?? item?.date_time ?? item?.created_at ?? null;
    return {
        id: item?.id,
        comment_id: item?.comment_id ?? item?.commentId ?? item?.comment?.id ?? item?.id ?? null,
        type: normalizeTypeKey(item?.type),
        status: Number(item?.status) || 0,
        transport_un: item?.transport_un ?? item?.uNumber ?? item?.transport?.uNumber ?? null,
        transport_model: item?.transport_model ?? item?.model_type ?? item?.model_name ?? item?.transport?.model_type ?? item?.transport?.model_name ?? null,
        data: item?.data ?? item?.value ?? null,
        description: item?.description ?? null,
        comment: item?.comment ?? null,
        comment_editor: item?.comment_editor ?? item?.comment_author ?? null,
        date_time_edit: item?.date_time_edit ?? item?.comment_updated_at ?? null,
        date_raw: dateRaw,
        date_ts: parseAlertDateToUnixSeconds(dateRaw),
    };
};

export const normalizeAlertArray = (input) => (Array.isArray(input) ? input.map(normalizeAlert) : []);

export const getAlertToneClass = (alertType, resolved = 0) => {
    if (Number(resolved) === 1) return "tone-resolved";
    const type = normalizeTypeKey(alertType);
    if (type === "distance" || type === "no_docs_cords" || type === "gps") return "tone-danger";
    if (type === "jamming") return "tone-warning";
    if (type === "not_work" || type === "no_equipment") return "tone-primary";
    return "tone-neutral";
};

const applyPlaceholder = (template, value) => {
    const raw = String(template || "");
    if (!raw.includes("{}")) return raw;
    const replacement = value == null || value === "" ? "" : String(value);
    const replaced = raw.replaceAll("{}", replacement);
    return replaced.replace(/\s{2,}/g, " ").trim();
};

export const resolveAlertLocalization = (alertType, lookup, value = null) => {
    const type = normalizeTypeKey(alertType);
    const fallbackType = String(alertType || "");
    const template = lookup?.[type]?.localization || lookup?.[fallbackType]?.localization || type || "Событие";
    return applyPlaceholder(template, value);
};

export const resolveAlertDescription = (alert, lookup) => {
    const explicitDescription = alert?.description;
    if (explicitDescription != null && String(explicitDescription).trim() !== "") {
        return String(explicitDescription);
    }

    const typedValue = alert?.data ?? alert?.value ?? null;
    return resolveAlertLocalization(alert?.type, lookup, typedValue);
};

export const getAlertTransportUn = (alert) => alert?.transport_un || "ТС не указано";
export const getAlertTransportModel = (alert) => alert?.transport_model || "Модель не указана";

export const getAlertCommentText = (alert) => {
    const value = alert?.comment;
    return value == null || String(value).trim() === "" ? "Нет комментариев" : String(value);
};

export const editAlertComment = async ({ commentId, comment }) => {
    const payload = {
        comment_id: String(commentId),
        comment: String(comment || "").trim(),
    };
    const { data } = await api.post("/users/edit_alert_comment", payload);
    return data;
};

export const loadAlertTypes = async (force = false) => {
    const isCacheValid = cachedTypes && (Date.now() - cachedAt < CACHE_TTL_MS);
    if (!force && isCacheValid) return cachedTypes;
    if (pendingPromise) return pendingPromise;

    pendingPromise = api.get("/alerts_presets/alert_types")
        .then((response) => {
            const items = normalizeTypesPayload(response.data)
                .map(normalizeAlertType)
                .filter((item) => item.alert_un);
            cachedTypes = items;
            cachedAt = Date.now();
            return items;
        })
        .catch(() => (cachedTypes || []))
        .finally(() => {
            pendingPromise = null;
        });

    return pendingPromise;
};
