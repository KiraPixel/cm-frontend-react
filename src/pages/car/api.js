import { api } from "../../shared/api/client";

export const getCarInfo = async (lotNumber) => {
    const { data } = await api.get(`/car/get_info/${encodeURIComponent(lotNumber)}`);
    return data?.data || data || {};
};

export const getCarHistory = async ({ nm, timeFrom, timeTo, monitoringSystem = "", blockNumber = "" }) => {
    const params = {
        nm,
        time_from: timeFrom,
        time_to: timeTo,
    };

    if (monitoringSystem) params.monitoring_system = monitoringSystem;
    if (blockNumber) params.block_number = blockNumber;

    const { data } = await api.get("/car/get_history", { params });
    return data?.data || data || [];
};

export const addCarComment = async ({ uNumber, text }) => {
    const form = new FormData();
    form.append("uNumber", uNumber);
    form.append("text", text);
    const { data } = await api.post("/users/add_comment", form);
    return data;
};

export const editCarComment = async ({ commentId, text, action = "" }) => {
    const form = new FormData();
    form.append("comment_id", String(commentId));
    if (text != null) form.append("text", String(text));
    if (action) form.append("action", action);
    const { data } = await api.post("/users/edit_comment", form);
    return data;
};

export const getAlertTypes = async () => {
    const { data } = await api.get("/alerts_presets/alert_types");
    return data?.data || data || [];
};

export const getVehicleAlertPreset = async (uNumber) => {
    const { data } = await api.post("/alerts_presets/vehicle", { uNumber });
    return data?.data || data || {};
};

export const getAlertPresets = async () => {
    const { data } = await api.get("/alerts_presets");
    return data?.data || data || [];
};

export const createAlertPreset = async (payload) => {
    const { data } = await api.post("/alerts_presets", payload);
    return data;
};

export const updateAlertPreset = async (id, payload) => {
    const { data } = await api.put(`/alerts_presets/${id}`, payload);
    return data;
};

export const deleteAlertPreset = async (id) => {
    const { data } = await api.delete(`/alerts_presets/${id}`);
    return data;
};

export const setCarPreset = async ({ uNumber, presetId }) => {
    const params = {
        uNumber,
        alert_type_presets_id: presetId == null ? "null" : presetId,
    };
    const { data } = await api.put("/car/set_preset", null, { params });
    return data;
};

export const getAxentaSensors = async (unitId) => {
    const { data } = await api.get(`/axenta/axenta_get_sensors/${unitId}`);
    return Array.isArray(data) ? data : [];
};

export const getAxentaCommands = async (unitId) => {
    const { data } = await api.get(`/axenta/axenta_get_commands/${unitId}`);
    return Array.isArray(data) ? data : [];
};

export const getAxentaLatestSensors = async ({ objectId, start, end }) => {
    const { data } = await api.get("/axenta/axenta_get_sensor_messages/", {
        params: {
            object_id: objectId,
            start,
            end,
            sort: "desc",
            mode: "sensors",
        },
    });
    return Array.isArray(data) ? data : [];
};

export const execAxentaCommand = async ({ unitId, command }) => {
    const { data } = await api.get(`/axenta/axenta_exec_cmd/${unitId}/${encodeURIComponent(command)}`);
    return data;
};
