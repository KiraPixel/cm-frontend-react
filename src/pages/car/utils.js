export const normalizeLotNumber = (raw) => {
    const text = String(raw || "").replace(/\s+/g, "").toUpperCase();
    if (/^[A-ZА-Я]+\d{5}$/.test(text)) {
        return `${text.slice(0, 1)} ${text.slice(1)}`;
    }
    return text;
};

export const formatDateTime = (raw) => {
    if (!raw) return "—";

    if (typeof raw === "number") {
        return new Date(raw * 1000).toLocaleString("ru-RU");
    }

    const asNumber = Number(raw);
    if (!Number.isNaN(asNumber) && asNumber > 0) {
        return new Date(asNumber * 1000).toLocaleString("ru-RU");
    }

    const parsed = Date.parse(String(raw));
    if (!Number.isNaN(parsed)) {
        return new Date(parsed).toLocaleString("ru-RU");
    }

    return String(raw);
};

export const toUnix = (datetimeLocalValue) => {
    if (!datetimeLocalValue) return null;
    const date = new Date(datetimeLocalValue);
    if (Number.isNaN(date.getTime())) return null;
    return Math.floor(date.getTime() / 1000);
};

export const formatNullable = (value) => {
    if (value == null || value === "") return "—";
    return String(value);
};
