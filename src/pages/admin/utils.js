export const unwrapData = (input) => {
    if (Array.isArray(input)) return input;
    if (Array.isArray(input?.data)) return input.data;
    return [];
};

export const normalizeBoolean = (value) => Number(value) === 1 || value === true;

export const formatTime = (raw) => {
    if (!raw || raw === "No data") return "Нет данных";

    const ts = Number(raw);
    if (Number.isNaN(ts)) return String(raw);

    return new Date(ts * 1000).toLocaleString("ru-RU");
};
