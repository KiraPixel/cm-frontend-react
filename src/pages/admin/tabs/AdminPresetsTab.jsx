import { useEffect, useMemo, useState } from "react";
import { api } from "../../../shared/api/client";
import { useFlash } from "../../../shared/flash/FlashProvider";
import { normalizeBoolean } from "../utils";

const emptyForm = {
    preset_name: "",
    wialon_danger_distance: "5",
    wialon_danger_hours_not_work: "72",
    jamming_zone: "0",
    active: "1",
};

const normalizeArray = (value) => {
    if (Array.isArray(value)) return value.map(String);
    if (typeof value === "string") {
        try {
            const parsed = JSON.parse(value.replace(/'/g, "\""));
            return Array.isArray(parsed) ? parsed.map(String) : [];
        } catch {
            return [];
        }
    }
    return [];
};

const normalizePresetsPayload = (payload) => {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    return [];
};

const normalizeAlertTypesPayload = (payload) => {
    if (Array.isArray(payload)) return payload;
    if (payload?.status === "success" && Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.data)) return payload.data;
    return [];
};

const normalizePreset = (item) => ({
    id: item?.id,
    preset_name: item?.preset_name || "Без названия",
    active: normalizeBoolean(item?.active),
    editable: normalizeBoolean(item?.editable),
    personalized: Number(item?.personalized || 0),
    vehicle_count: Number(item?.vehicle_count || 0),
    enable_alert_types: normalizeArray(item?.enable_alert_types),
    disable_alert_types: normalizeArray(item?.disable_alert_types),
    wialon_danger_distance: Number(item?.wialon_danger_distance ?? 5),
    wialon_danger_hours_not_work: Number(item?.wialon_danger_hours_not_work ?? 72),
    jamming_zone: Number(item?.jamming_zone ?? 0),
});

export function AdminPresetsTab() {
    const flash = useFlash();

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [presets, setPresets] = useState([]);
    const [alertTypes, setAlertTypes] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");

    const [panelMode, setPanelMode] = useState(null);
    const [selectedPreset, setSelectedPreset] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [alertStateByUn, setAlertStateByUn] = useState({});

    const filteredPresets = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return presets;
        return presets.filter((preset) => String(preset.preset_name || "").toLowerCase().includes(query));
    }, [presets, searchQuery]);

    const closePanel = () => {
        setPanelMode(null);
        setSelectedPreset(null);
        setForm(emptyForm);
        setAlertStateByUn({});
    };

    const loadAlertTypes = async () => {
        const { data } = await api.get("/alerts_presets/alert_types");
        const list = normalizeAlertTypesPayload(data)
            .map((item) => ({
                alert_un: String(item?.alert_un || ""),
                localization: item?.localization || item?.alert_un || "Без названия",
            }))
            .filter((item) => item.alert_un);
        setAlertTypes(list);
        return list;
    };

    const loadPresets = async () => {
        setLoading(true);
        try {
            const { data } = await api.get("/alerts_presets/with_vehicle_count");
            const list = normalizePresetsPayload(data)
                .map(normalizePreset)
                .filter((preset) => preset.personalized !== 1);
            setPresets(list);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const bootstrap = async () => {
            await Promise.all([loadAlertTypes(), loadPresets()]);
        };
        bootstrap();
    }, []);

    const initAlertStates = (types, preset) => {
        const states = {};
        types.forEach((type) => {
            const alertUn = type.alert_un;
            if (preset?.enable_alert_types?.includes(alertUn)) {
                states[alertUn] = "enabled";
            } else if (preset?.disable_alert_types?.includes(alertUn)) {
                states[alertUn] = "disabled";
            } else {
                states[alertUn] = "inherited";
            }
        });
        setAlertStateByUn(states);
    };

    const openCreate = async () => {
        const types = alertTypes.length ? alertTypes : await loadAlertTypes();
        setPanelMode("create");
        setSelectedPreset(null);
        setForm(emptyForm);
        initAlertStates(types, null);
    };

    const openEdit = async (preset) => {
        const types = alertTypes.length ? alertTypes : await loadAlertTypes();
        setPanelMode("edit");
        setSelectedPreset(preset);
        setForm({
            preset_name: preset.preset_name || "",
            wialon_danger_distance: String(preset.wialon_danger_distance ?? 5),
            wialon_danger_hours_not_work: String(preset.wialon_danger_hours_not_work ?? 72),
            jamming_zone: String(preset.jamming_zone ?? 0),
            active: preset.active ? "1" : "0",
        });
        initAlertStates(types, preset);
    };

    const removePreset = async (preset) => {
        if (!preset?.editable) {
            flash.warning("Системный пресет нельзя удалить");
            return;
        }

        if (!window.confirm(`Удалить пресет "${preset.preset_name}"?`)) return;
        await api.delete(`/alerts_presets/${preset.id}`);
        flash.success("Пресет удален");
        if (selectedPreset?.id === preset.id) closePanel();
        await loadPresets();
    };

    const savePreset = async (event) => {
        event.preventDefault();

        const enable_alert_types = [];
        const disable_alert_types = [];
        Object.entries(alertStateByUn).forEach(([alertUn, state]) => {
            if (state === "enabled") enable_alert_types.push(alertUn);
            if (state === "disabled") disable_alert_types.push(alertUn);
        });

        const payload = {
            preset_name: String(form.preset_name || "").trim(),
            enable_alert_types,
            disable_alert_types,
            wialon_danger_distance: Number(form.wialon_danger_distance || 0),
            wialon_danger_hours_not_work: Number(form.wialon_danger_hours_not_work || 0),
            jamming_zone: Number(form.jamming_zone || 0),
            active: Number(form.active || 0),
            editable: 1,
            personalized: 0,
        };

        try {
            setSaving(true);
            if (panelMode === "edit" && selectedPreset?.id != null) {
                await api.put(`/alerts_presets/${selectedPreset.id}`, payload);
                flash.success("Пресет обновлен");
            } else {
                await api.post("/alerts_presets", payload);
                flash.success("Пресет создан");
            }

            closePanel();
            await loadPresets();
        } finally {
            setSaving(false);
        }
    };

    const setAlertState = (alertUn, state) => {
        setAlertStateByUn((prev) => ({ ...prev, [alertUn]: state }));
    };

    const enabledCount = useMemo(
        () => Object.values(alertStateByUn).filter((v) => v === "enabled").length,
        [alertStateByUn],
    );
    const disabledCount = useMemo(
        () => Object.values(alertStateByUn).filter((v) => v === "disabled").length,
        [alertStateByUn],
    );

    return (
        <section className={`admin-users-workspace admin-preset-workspace ${panelMode ? "is-panel-open" : ""}`}>
            <div className="admin-users-card admin-card">
                <header className="admin-users-header">
                    <div className="admin-users-search">
                        <i className="bi bi-search"></i>
                        <input
                            value={searchQuery}
                            onChange={(event) => setSearchQuery(event.target.value)}
                            placeholder="Поиск пресета"
                        />
                    </div>
                    <button type="button" className="btn btn-primary btn-sm" onClick={openCreate}>
                        <i className="bi bi-plus-circle me-1"></i>
                        Создать пресет
                    </button>
                </header>

                <div className="admin-users-table-wrap custom-scrollbar">
                    {loading && (
                        <div className="admin-loading text-center py-5">
                            <div className="spinner-border text-primary" role="status" />
                        </div>
                    )}

                    {!loading && (
                        <table className="table align-middle admin-users-table mb-0">
                            <thead>
                                <tr>
                                    <th>Пресет</th>
                                    <th>ТС</th>
                                    <th>Типы алертов</th>
                                    <th>Активен</th>
                                    <th className="text-end">Действия</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredPresets.map((preset) => (
                                    <tr key={preset.id}>
                                        <td>
                                            <div className="fw-semibold">{preset.preset_name}</div>
                                            <small className="text-body-secondary">
                                                Дистанция: {preset.wialon_danger_distance} км, простой: {preset.wialon_danger_hours_not_work} ч
                                            </small>
                                        </td>
                                        <td>{preset.vehicle_count}</td>
                                        <td>
                                            <div className="admin-preset-type-badges">
                                                <span className="badge text-bg-success">Вкл: {preset.enable_alert_types.length}</span>
                                                <span className="badge text-bg-danger">Выкл: {preset.disable_alert_types.length}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`badge ${preset.active ? "text-bg-success" : "text-bg-secondary"}`}>
                                                {preset.active ? "Да" : "Нет"}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="admin-users-actions admin-preset-actions">
                                                {preset.editable && (
                                                    <>
                                                        <button
                                                            type="button"
                                                            className="btn btn-sm btn-outline-primary"
                                                            onClick={() => openEdit(preset)}
                                                            title="Редактировать"
                                                        >
                                                            <i className="bi bi-pencil"></i>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="btn btn-sm btn-outline-danger"
                                                            onClick={() => removePreset(preset)}
                                                            title="Удалить"
                                                        >
                                                            <i className="bi bi-trash"></i>
                                                        </button>
                                                    </>
                                                )}
                                                {!preset.editable && (
                                                    <span className="badge text-bg-secondary" title="Системный пресет">
                                                        <i className="bi bi-shield-lock me-1"></i>
                                                        Системный
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            <aside className={`admin-user-panel ${panelMode ? "open" : ""}`} aria-hidden={!panelMode}>
                {!panelMode && <div className="admin-user-panel-empty">Выберите действие</div>}

                {(panelMode === "create" || panelMode === "edit") && (
                    <div className="admin-user-panel-inner">
                        <header className="admin-user-panel-header">
                            <h2>{panelMode === "edit" ? `Редактирование: ${selectedPreset?.preset_name || ""}` : "Создать пресет"}</h2>
                            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={closePanel}>
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </header>

                        <form className="admin-user-form admin-preset-form" onSubmit={savePreset}>
                            <section className="admin-preset-section">
                                <div className="admin-preset-section-title">Общие параметры</div>
                                <label className="form-label mb-1">Название</label>
                                <input
                                    className="form-control"
                                    value={form.preset_name}
                                    onChange={(event) => setForm((prev) => ({ ...prev, preset_name: event.target.value }))}
                                    required
                                />
                                <div className="admin-preset-metrics-row">
                                    <div>
                                        <label className="form-label mb-1 mt-2">Опасная дистанция (км)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            className="form-control"
                                            value={form.wialon_danger_distance}
                                            onChange={(event) => setForm((prev) => ({ ...prev, wialon_danger_distance: event.target.value }))}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="form-label mb-1 mt-2">Часы простоя</label>
                                        <input
                                            type="number"
                                            min="0"
                                            className="form-control"
                                            value={form.wialon_danger_hours_not_work}
                                            onChange={(event) => setForm((prev) => ({ ...prev, wialon_danger_hours_not_work: event.target.value }))}
                                            required
                                        />
                                    </div>
                                </div>
                            </section>

                            <section className="admin-preset-section">
                                <div className="admin-preset-section-title">Режимы</div>
                                <div className="admin-preset-flags-row">
                                    <div>
                                        <label className="form-label mb-1 mt-2">Работа в зоне глушилок</label>
                                        <select
                                            className="form-select"
                                            value={form.jamming_zone}
                                            onChange={(event) => setForm((prev) => ({ ...prev, jamming_zone: event.target.value }))}
                                        >
                                            <option value="1">Да</option>
                                            <option value="0">Нет</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="form-label mb-1 mt-2">Активен</label>
                                        <select
                                            className="form-select"
                                            value={form.active}
                                            onChange={(event) => setForm((prev) => ({ ...prev, active: event.target.value }))}
                                        >
                                            <option value="1">Да</option>
                                            <option value="0">Нет</option>
                                        </select>
                                    </div>
                                </div>
                            </section>

                            <section className="admin-preset-section">
                                <div className="admin-preset-alert-types-head">
                                    <div className="admin-preset-section-title m-0">Типы алертов</div>
                                    <div className="admin-preset-stats">
                                        <span className="badge text-bg-success">Вкл: {enabledCount}</span>
                                        <span className="badge text-bg-danger">Выкл: {disabledCount}</span>
                                    </div>
                                </div>
                                <div className="admin-preset-alert-types">
                                    {alertTypes.map((type) => {
                                        const state = alertStateByUn[type.alert_un] || "inherited";
                                        return (
                                            <div key={type.alert_un} className={`admin-preset-alert-type-row state-${state}`}>
                                                <div className="admin-preset-alert-type-name">{type.localization}</div>
                                                <div className="btn-group btn-group-sm admin-preset-state-buttons" role="group">
                                                    <button
                                                        type="button"
                                                        className={`btn ${state === "enabled" ? "btn-success" : "btn-outline-success"}`}
                                                        onClick={() => setAlertState(type.alert_un, "enabled")}
                                                        title="Включить"
                                                    >
                                                        <i className="bi bi-check-circle"></i>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className={`btn ${state === "disabled" ? "btn-danger" : "btn-outline-danger"}`}
                                                        onClick={() => setAlertState(type.alert_un, "disabled")}
                                                        title="Отключить"
                                                    >
                                                        <i className="bi bi-x-circle"></i>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className={`btn ${state === "inherited" ? "btn-secondary" : "btn-outline-secondary"}`}
                                                        onClick={() => setAlertState(type.alert_un, "inherited")}
                                                        title="Наследовать"
                                                    >
                                                        <i className="bi bi-dash-circle"></i>
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>

                            <div className="admin-user-panel-actions">
                                <button type="button" className="btn btn-outline-secondary" onClick={closePanel}>
                                    Отмена
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>
                                    {saving ? "Сохранение..." : "Сохранить"}
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </aside>
        </section>
    );
}
