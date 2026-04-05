import { useEffect, useMemo, useState } from "react";
import { useFlash } from "../../../shared/flash/FlashProvider";
import {
    execAxentaCommand,
    getAxentaCommands,
    getAxentaLatestSensors,
    getAxentaSensors,
} from "../api";

const formatSensorValue = (sensor, value) => {
    const normalized = value == null ? "Н/Д" : value;
    const unit = String(sensor?.unit || "");

    if (["ignition_sensor", "custom_digital_sensor"].includes(sensor?.type) && unit.includes("/")) {
        const [enabled, disabled] = unit.split("/").map((item) => item.trim());
        return Number(normalized) === 1 ? `${enabled} (${normalized})` : `${disabled || enabled} (${normalized})`;
    }

    return unit ? `${normalized} ${unit}` : String(normalized);
};

const normalizeAxentaUnits = (monitoring) => {
    return (Array.isArray(monitoring) ? monitoring : [])
        .filter((item) => String(item?.type || "").toLowerCase() === "axenta")
        .filter((item) => item?.unit_id != null);
};

export function CarSensorsTab({ monitoring = [] }) {
    const flash = useFlash();
    const units = useMemo(() => normalizeAxentaUnits(monitoring), [monitoring]);

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [metaByUnit, setMetaByUnit] = useState({});
    const [sensorValuesByUnit, setSensorValuesByUnit] = useState({});
    const [commandBusyKey, setCommandBusyKey] = useState("");

    const loadMeta = async () => {
        if (!units.length) {
            setMetaByUnit({});
            return;
        }

        const entries = await Promise.all(units.map(async (unit) => {
            const [sensors, commands] = await Promise.all([
                getAxentaSensors(unit.unit_id),
                getAxentaCommands(unit.unit_id),
            ]);
            return [String(unit.unit_id), { sensors, commands }];
        }));

        setMetaByUnit(Object.fromEntries(entries));
    };

    const refreshValues = async () => {
        if (!units.length) {
            setSensorValuesByUnit({});
            return;
        }

        setRefreshing(true);
        try {
            const now = Math.floor(Date.now() / 1000);
            const entries = await Promise.all(units.map(async (unit) => {
                const start = Number(unit.last_unix_time || now - 86400);
                const payload = await getAxentaLatestSensors({ objectId: unit.unit_id, start, end: now });
                const latestSensors = Array.isArray(payload) && payload[0]?.sensors ? payload[0].sensors : null;
                return [String(unit.unit_id), latestSensors || {}];
            }));
            setSensorValuesByUnit(Object.fromEntries(entries));
        } catch {
            flash.error("Не удалось обновить значения датчиков");
        } finally {
            setRefreshing(false);
        }
    };

    useEffect(() => {
        const bootstrap = async () => {
            try {
                setLoading(true);
                await loadMeta();
                await refreshValues();
            } catch {
                flash.error("Не удалось загрузить датчики");
            } finally {
                setLoading(false);
            }
        };

        bootstrap();
    }, [monitoring]);

    const runCommand = async (unitId, command) => {
        const key = `${unitId}:${command}`;
        try {
            setCommandBusyKey(key);
            const result = await execAxentaCommand({ unitId, command });
            if (result?.status !== "sent" && result?.status !== "success") {
                flash.error(result?.error || result?.message || "Не удалось выполнить команду");
                return;
            }
            flash.success("Команда отправлена");
            await refreshValues();
        } catch {
            flash.error("Не удалось выполнить команду");
        } finally {
            setCommandBusyKey("");
        }
    };

    if (loading) {
        return (
            <div className="car-loading-state">
                <div className="spinner-border text-primary" role="status" />
            </div>
        );
    }

    if (!units.length) {
        return (
            <section className="car-panel-card">
                <header><h3>Датчики</h3></header>
                <div className="car-panel-body text-body-secondary">Устройства Axenta не найдены.</div>
            </section>
        );
    }

    return (
        <div className="car-sensors-layout">
            <section className="car-panel-card">
                <header><h3>Axenta датчики</h3></header>
                <div className="car-panel-body">
                    <div className="d-flex justify-content-end mb-3">
                        <button type="button" className="btn btn-outline-primary" onClick={refreshValues} disabled={refreshing}>
                            <i className="bi bi-arrow-repeat me-1"></i>
                            {refreshing ? "Обновление..." : "Обновить данные"}
                        </button>
                    </div>

                    <div className="car-sensors-grid">
                        {units.map((unit) => {
                            const unitId = String(unit.unit_id);
                            const meta = metaByUnit[unitId] || { sensors: [], commands: [] };
                            const latest = sensorValuesByUnit[unitId] || {};

                            return (
                                <article key={unitId} className="car-sensor-card">
                                    <div className="car-sensor-card-head">
                                        <strong>{unit.uid || `Unit ${unitId}`}</strong>
                                        <span className={`badge ${unit.online === "Online" ? "text-bg-success" : "text-bg-secondary"}`}>
                                            {unit.online || "Offline"}
                                        </span>
                                    </div>
                                    <div className="text-body-secondary small mb-2">Последняя связь: {unit.last_time || "—"}</div>

                                    <div className="car-sensor-values">
                                        {meta.sensors.length === 0 && <div className="text-body-secondary">Датчики отсутствуют</div>}
                                        {meta.sensors.map((sensor) => {
                                            const rawValue = latest[`sensor__${sensor.id}`];
                                            return (
                                                <div key={sensor.id} className="car-sensor-value-row">
                                                    <span>{sensor.name}</span>
                                                    <strong>{formatSensorValue(sensor, rawValue)}</strong>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {meta.commands.length > 0 && (
                                        <div className="car-sensor-commands">
                                            <div className="small text-body-secondary mb-1">Команды</div>
                                            <div className="d-flex flex-wrap gap-1">
                                                {meta.commands.map((command, index) => {
                                                    const commandText = String(command?.params || "");
                                                    const key = `${unitId}:${commandText}`;
                                                    return (
                                                        <button
                                                            key={`${commandText}-${index}`}
                                                            type="button"
                                                            className="btn btn-sm btn-outline-secondary"
                                                            disabled={commandBusyKey === key}
                                                            onClick={() => runCommand(unitId, commandText)}
                                                        >
                                                            {command?.name || commandText}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </article>
                            );
                        })}
                    </div>
                </div>
            </section>
        </div>
    );
}
