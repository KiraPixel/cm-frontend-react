import { useEffect, useState } from "react";
import { api } from "../../../shared/api/client";
import { useFlash } from "../../../shared/flash/FlashProvider";
import { settingsModules } from "../constants";
import { formatTime, normalizeBoolean } from "../utils";

export function AdminSettingsTab() {
    const flash = useFlash();
    const [loading, setLoading] = useState(false);
    const [settingsState, setSettingsState] = useState(null);
    const [healthState, setHealthState] = useState(null);
    const [pendingModule, setPendingModule] = useState(null);

    const loadSettings = async () => {
        setLoading(true);
        try {
            const [settingsRes, healthRes] = await Promise.all([
                api.get("/settings/system_settings"),
                api.get("/health"),
            ]);
            setSettingsState(settingsRes.data || {});
            setHealthState(healthRes.data || {});
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSettings();
    }, []);

    const toggleModule = async (module) => {
        const currentStatus = normalizeBoolean(settingsState?.[module.id]) ? 1 : 0;
        const nextStatus = currentStatus ? 0 : 1;
        try {
            setPendingModule(module.id);
            await api.post(module.endpoint, { status: nextStatus });
            flash.success(`Статус модуля "${module.title}" обновлен`);
            await loadSettings();
        } finally {
            setPendingModule(null);
        }
    };

    if (loading) {
        return (
            <div className="admin-loading text-center py-5">
                <div className="spinner-border text-primary" role="status" />
            </div>
        );
    }

    return (
        <section className="admin-settings-grid">
            {settingsModules.map((module) => {
                const enabled = normalizeBoolean(settingsState?.[module.id]);
                const health = healthState?.[module.healthKey] || {};
                const healthy = normalizeBoolean(health?.status);
                const isPending = pendingModule === module.id;

                return (
                    <article key={module.id} className={`admin-settings-card ${enabled ? "is-enabled" : "is-disabled"}`}>
                        <header className="admin-settings-card-header">
                            <div className="admin-settings-card-title-wrap">
                                <span className="admin-settings-card-icon">
                                    <i className={`bi ${module.icon}`}></i>
                                </span>
                                <h2>{module.title}</h2>
                            </div>
                            <span className={`badge ${enabled ? "text-bg-success" : "text-bg-secondary"}`}>
                                {enabled ? "Включен" : "Выключен"}
                            </span>
                        </header>

                        <div className="admin-settings-card-body">
                            <div className="admin-settings-stat-row">
                                <span>Состояние сервиса</span>
                                <strong className={healthy ? "text-success" : "text-danger"}>
                                    {healthy ? "Работает" : "Ошибка"}
                                </strong>
                            </div>
                            <div className="admin-settings-stat-row">
                                <span>Последнее обновление</span>
                                <strong>{formatTime(health?.last_time)}</strong>
                            </div>
                        </div>

                        <footer className="admin-settings-card-actions">
                            <button
                                type="button"
                                className={`btn ${enabled ? "btn-outline-danger" : "btn-primary"}`}
                                onClick={() => toggleModule(module)}
                                disabled={isPending}
                            >
                                {isPending ? "Применение..." : (enabled ? "Отключить модуль" : "Включить модуль")}
                            </button>
                        </footer>
                    </article>
                );
            })}
        </section>
    );
}
