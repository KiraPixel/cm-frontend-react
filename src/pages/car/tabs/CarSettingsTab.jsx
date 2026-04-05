import { useEffect, useMemo, useState } from "react";
import { useFlash } from "../../../shared/flash/FlashProvider";
import {
    createAlertPreset,
    deleteAlertPreset,
    getAlertPresets,
    getAlertTypes,
    getVehicleAlertPreset,
    setCarPreset,
    updateAlertPreset,
} from "../api";

const normalizeArray = (value) => {
    if (Array.isArray(value)) return value.map(String);
    if (typeof value === "string") {
        try {
            const parsed = JSON.parse(value.replace(/'/g, '"'));
            return Array.isArray(parsed) ? parsed.map(String) : [];
        } catch {
            return [];
        }
    }
    return [];
};

const normalizePreset = (item) => ({
    id: item?.id,
    preset_name: item?.preset_name || "Без названия",
    active: Number(item?.active || 0),
    editable: Number(item?.editable || 0),
    personalized: Number(item?.personalized || 0),
    enable_alert_types: normalizeArray(item?.enable_alert_types),
    disable_alert_types: normalizeArray(item?.disable_alert_types),
    wialon_danger_distance: Number(item?.wialon_danger_distance || 0),
    wialon_danger_hours_not_work: Number(item?.wialon_danger_hours_not_work || 0),
    jamming_zone: Number(item?.jamming_zone || 0),
});

const mapByAlertUn = (types) => {
    const map = {};
    (Array.isArray(types) ? types : []).forEach((item) => {
        if (!item?.alert_un) return;
        map[String(item.alert_un)] = item.localization || item.alert_un;
    });
    return map;
};

const getEffective = (defaultPreset, customPreset) => {
    const effective = {
        enable_alert_types: [...(defaultPreset?.enable_alert_types || [])],
        wialon_danger_distance: Number(defaultPreset?.wialon_danger_distance || 0),
        wialon_danger_hours_not_work: Number(defaultPreset?.wialon_danger_hours_not_work || 0),
    };

    if (customPreset?.active) {
        const disable = customPreset.disable_alert_types || [];
        const enable = customPreset.enable_alert_types || [];
        effective.enable_alert_types = effective.enable_alert_types.filter((alert) => !disable.includes(alert));
        effective.enable_alert_types = [...new Set([...effective.enable_alert_types, ...enable])];
        effective.wialon_danger_distance = Number(customPreset.wialon_danger_distance || 0);
        effective.wialon_danger_hours_not_work = Number(customPreset.wialon_danger_hours_not_work || 0);
    }

    return effective;
};

export function CarSettingsTab({ lotNumber }) {
    const flash = useFlash();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [alertTypes, setAlertTypes] = useState([]);
    const [defaultPreset, setDefaultPreset] = useState(null);
    const [customPreset, setCustomPreset] = useState(null);
    const [presets, setPresets] = useState([]);

    const [presetSelect, setPresetSelect] = useState("---");
    const [form, setForm] = useState({
        wialon_danger_distance: "0",
        wialon_danger_hours_not_work: "0",
        jamming_zone: "0",
    });
    const [alertStates, setAlertStates] = useState({});

    const localizationMap = useMemo(() => mapByAlertUn(alertTypes), [alertTypes]);
    const customPresetName = `Custom_${lotNumber}`;

    const effective = useMemo(() => getEffective(defaultPreset, customPreset), [defaultPreset, customPreset]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [typesRaw, vehicleRaw, presetsRaw] = await Promise.all([
                getAlertTypes(),
                getVehicleAlertPreset(lotNumber),
                getAlertPresets(),
            ]);

            const types = (Array.isArray(typesRaw) ? typesRaw : []).map((item) => ({
                alert_un: String(item?.alert_un || ""),
                localization: String(item?.localization || item?.alert_un || ""),
            })).filter((item) => item.alert_un);

            const normalizedDefault = normalizePreset(vehicleRaw?.default_preset || {});
            const normalizedCustom = vehicleRaw?.custom_preset ? normalizePreset(vehicleRaw.custom_preset) : null;
            const allPresets = (Array.isArray(presetsRaw) ? presetsRaw : []).map(normalizePreset);

            setAlertTypes(types);
            setDefaultPreset(normalizedDefault);
            setCustomPreset(normalizedCustom);
            setPresets(allPresets);

            const activePreset = normalizedCustom?.active ? normalizedCustom : null;
            setForm({
                wialon_danger_distance: String(activePreset?.wialon_danger_distance ?? normalizedDefault.wialon_danger_distance ?? 0),
                wialon_danger_hours_not_work: String(activePreset?.wialon_danger_hours_not_work ?? normalizedDefault.wialon_danger_hours_not_work ?? 0),
                jamming_zone: String(activePreset?.jamming_zone ?? normalizedDefault.jamming_zone ?? 0),
            });

            const states = {};
            types.forEach((type) => {
                const key = type.alert_un;
                if (activePreset?.enable_alert_types?.includes(key)) states[key] = "enabled";
                else if (activePreset?.disable_alert_types?.includes(key)) states[key] = "disabled";
                else states[key] = "inherited";
            });
            setAlertStates(states);

            if (activePreset?.personalized && activePreset?.preset_name === customPresetName) {
                setPresetSelect(String(activePreset.id));
            } else {
                setPresetSelect("---");
            }
        } catch {
            flash.error("Не удалось загрузить настройки алертов");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [lotNumber]);

    const setAlertState = (alertUn, state) => {
        setAlertStates((prev) => ({ ...prev, [alertUn]: state }));
    };

    const removePresetFromCar = async () => {
        const existingCustom = presets.find((preset) => preset.preset_name === customPresetName);
        if (existingCustom?.id) {
            await deleteAlertPreset(existingCustom.id);
        }
        await setCarPreset({ uNumber: lotNumber, presetId: null });
    };

    const saveCustomPreset = async () => {
        const enable_alert_types = [];
        const disable_alert_types = [];

        Object.entries(alertStates).forEach(([alertUn, state]) => {
            if (state === "enabled") enable_alert_types.push(alertUn);
            if (state === "disabled") disable_alert_types.push(alertUn);
        });

        const payload = {
            preset_name: customPresetName,
            enable_alert_types,
            disable_alert_types,
            wialon_danger_distance: Number(form.wialon_danger_distance || 0),
            wialon_danger_hours_not_work: Number(form.wialon_danger_hours_not_work || 0),
            jamming_zone: Number(form.jamming_zone || 0),
            active: 1,
            editable: 1,
            personalized: 1,
        };

        const existingCustom = presets.find((preset) => preset.preset_name === customPresetName);

        let presetId = existingCustom?.id;
        if (existingCustom?.id) {
            const result = await updateAlertPreset(existingCustom.id, payload);
            presetId = result?.id || existingCustom.id;
        } else {
            const result = await createAlertPreset(payload);
            presetId = result?.id;
        }

        if (!presetId) {
            throw new Error("preset_id_missing");
        }

        await setCarPreset({ uNumber: lotNumber, presetId });
    };

    const applyPreset = async () => {
        if (presetSelect === "---" || presetSelect === "new") return;

        try {
            setSaving(true);
            if (presetSelect === "remove") {
                await removePresetFromCar();
                flash.success("Пресет удален с транспорта");
            } else {
                await setCarPreset({ uNumber: lotNumber, presetId: Number(presetSelect) });
                flash.success("Пресет применен");
            }
            await loadData();
        } catch {
            flash.error("Не удалось применить пресет");
        } finally {
            setSaving(false);
        }
    };

    const submitForm = async (event) => {
        event.preventDefault();
        try {
            setSaving(true);
            await saveCustomPreset();
            flash.success("Настройки сохранены");
            await loadData();
        } catch {
            flash.error("Не удалось сохранить настройки");
        } finally {
            setSaving(false);
        }
    };

    const availablePresetOptions = useMemo(() => {
        return presets.filter((preset) => preset.personalized !== 1 || preset.preset_name === customPresetName);
    }, [presets, customPresetName]);

    const showEditor = presetSelect === "new" || (customPreset?.id != null && String(customPreset.id) === String(presetSelect));

    if (loading) {
        return (
            <div className="car-loading-state">
                <div className="spinner-border text-primary" role="status" />
            </div>
        );
    }

    return (
        <div className="car-settings-layout">
            <section className="car-panel-card">
                <header><h3>Текущие настройки</h3></header>
                <div className="car-panel-body">
                    <div className="car-settings-badges">
                        {(effective.enable_alert_types || []).map((alertUn) => (
                            <span key={alertUn} className="badge text-bg-primary">
                                {localizationMap[alertUn] || alertUn}
                            </span>
                        ))}
                        {(effective.enable_alert_types || []).length === 0 && <span className="text-body-secondary">Нет активных алертов</span>}
                    </div>
                    <div className="car-settings-metrics">
                        <div><span>Опасная дистанция</span><strong>{effective.wialon_danger_distance} км</strong></div>
                        <div><span>Часы простоя</span><strong>{effective.wialon_danger_hours_not_work} ч</strong></div>
                        <div><span>Пресет по умолчанию</span><strong>{defaultPreset?.preset_name || "—"}</strong></div>
                        <div><span>Текущий пресет</span><strong>{customPreset?.active ? (customPreset.preset_name || "—") : "Не задан"}</strong></div>
                    </div>
                </div>
            </section>

            <section className="car-panel-card">
                <header><h3>Пресеты</h3></header>
                <div className="car-panel-body">
                    <div className="car-settings-preset-row">
                        <select className="form-select" value={presetSelect} onChange={(e) => setPresetSelect(e.target.value)}>
                            <option value="---">---</option>
                            <option value="new">Создать новый</option>
                            <option value="remove">Удалить пресет с транспорта</option>
                            {availablePresetOptions.map((preset) => (
                                <option key={preset.id} value={String(preset.id)}>{preset.preset_name}</option>
                            ))}
                        </select>
                        <button
                            type="button"
                            className="btn btn-outline-primary"
                            onClick={applyPreset}
                            disabled={saving || showEditor || presetSelect === "---" || presetSelect === "new"}
                        >
                            Применить
                        </button>
                    </div>
                </div>
            </section>

            {showEditor && (
                <section className="car-panel-card">
                    <header><h3>{presetSelect === "new" ? "Новый персональный пресет" : "Редактирование персонального пресета"}</h3></header>
                    <div className="car-panel-body">
                        <form onSubmit={submitForm} className="car-settings-form">
                            <div className="car-settings-form-grid">
                                <div>
                                    <label className="form-label">Опасная дистанция (км)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        className="form-control"
                                        value={form.wialon_danger_distance}
                                        onChange={(e) => setForm((prev) => ({ ...prev, wialon_danger_distance: e.target.value }))}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="form-label">Часы простоя</label>
                                    <input
                                        type="number"
                                        min="0"
                                        className="form-control"
                                        value={form.wialon_danger_hours_not_work}
                                        onChange={(e) => setForm((prev) => ({ ...prev, wialon_danger_hours_not_work: e.target.value }))}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="form-label">Работа в зоне глушилок</label>
                                    <select
                                        className="form-select"
                                        value={form.jamming_zone}
                                        onChange={(e) => setForm((prev) => ({ ...prev, jamming_zone: e.target.value }))}
                                    >
                                        <option value="1">Да</option>
                                        <option value="0">Нет</option>
                                    </select>
                                </div>
                            </div>

                            <div className="car-settings-alert-types">
                                {alertTypes.map((type) => {
                                    const state = alertStates[type.alert_un] || "inherited";
                                    return (
                                        <div key={type.alert_un} className="car-settings-alert-row">
                                            <span>{type.localization}</span>
                                            <div className="btn-group btn-group-sm">
                                                <button type="button" className={`btn ${state === "enabled" ? "btn-success" : "btn-outline-success"}`} onClick={() => setAlertState(type.alert_un, "enabled")}>Вкл</button>
                                                <button type="button" className={`btn ${state === "disabled" ? "btn-danger" : "btn-outline-danger"}`} onClick={() => setAlertState(type.alert_un, "disabled")}>Выкл</button>
                                                <button type="button" className={`btn ${state === "inherited" ? "btn-secondary" : "btn-outline-secondary"}`} onClick={() => setAlertState(type.alert_un, "inherited")}>Насл</button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="d-flex justify-content-end">
                                <button type="submit" className="btn btn-primary" disabled={saving}>
                                    {saving ? "Сохранение..." : "Сохранить"}
                                </button>
                            </div>
                        </form>
                    </div>
                </section>
            )}
        </div>
    );
}
