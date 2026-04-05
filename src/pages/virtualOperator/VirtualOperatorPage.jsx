import { useEffect, useMemo, useState } from "react";
import { useFlash } from "../../shared/flash/FlashProvider";
import {
    buildAlertTypeLookup,
    editAlertComment,
    formatAlertDate,
    getAlertToneClass,
    getAlertTransportUn,
    loadAlertTypes,
    normalizeAlertArray,
    resolveAlertDescription,
} from "../../shared/alerts/alertTypeController";
import { AlertCard } from "../../shared/alerts/AlertCard";
import { api } from "../../shared/api/client";
import "./VirtualOperatorPage.css";

const ALERT_GROUPS = [
    { key: "distance", label: "Опасность угона", icon: "bi-lock-fill" },
    { key: "no_docs_cords", label: "Нет координат в 1С", icon: "bi-file-earmark-minus-fill" },
    { key: "not_work", label: "Нерабочее оборудование", icon: "bi-tools" },
    { key: "no_equipment", label: "Отсутствие оборудования", icon: "bi-gear-fill" },
    { key: "other", label: "Другие", icon: "bi-exclamation-square-fill" },
];

const emptyActiveData = {
    distance: [],
    no_docs_cords: [],
    not_work: [],
    no_equipment: [],
    other: [],
    total_active: 0,
};

const parseDateStart = (value) => {
    if (!value) return null;
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? null : Math.floor(date.getTime() / 1000);
};

const parseDateEnd = (value) => {
    if (!value) return null;
    const date = new Date(`${value}T23:59:59`);
    return Number.isNaN(date.getTime()) ? null : Math.floor(date.getTime() / 1000);
};

export function VirtualOperatorPage() {
    const flash = useFlash();
    const [loadingRecent, setLoadingRecent] = useState(true);
    const [loadingActive, setLoadingActive] = useState(true);
    const [alertTypeLookup, setAlertTypeLookup] = useState({});

    const [last100, setLast100] = useState({ items: [], total: 0 });
    const [activeData, setActiveData] = useState(emptyActiveData);
    const [activeTab, setActiveTab] = useState("distance");

    const [transportQuery, setTransportQuery] = useState("");
    const [textQuery, setTextQuery] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    const [editingAlert, setEditingAlert] = useState(null);
    const [commentDraft, setCommentDraft] = useState("");
    const [savingComment, setSavingComment] = useState(false);

    useEffect(() => {
        let mounted = true;

        loadAlertTypes().then((types) => {
            if (!mounted) return;
            setAlertTypeLookup(buildAlertTypeLookup(types));
        });

        setLoadingRecent(true);
        api.get("/alerts/last-100")
            .then((lastRes) => {
                if (!mounted) return;
                const payload = lastRes.data?.data || lastRes.data || {};
                setLast100({
                    items: normalizeAlertArray(payload.items),
                    total: Number(payload.total) || 0,
                });
            })
            .finally(() => setLoadingRecent(false));

        setLoadingActive(true);
        api.get("/alerts/active")
            .then((activeRes) => {
                if (!mounted) return;
                const payload = activeRes.data?.data || activeRes.data || {};
                setActiveData({
                    distance: normalizeAlertArray(payload.distance),
                    no_docs_cords: normalizeAlertArray(payload.no_docs_cords),
                    not_work: normalizeAlertArray(payload.not_work),
                    no_equipment: normalizeAlertArray(payload.no_equipment),
                    other: normalizeAlertArray(payload.other),
                    total_active: Number(payload.total_active) || 0,
                });
            })
            .finally(() => setLoadingActive(false));

        return () => {
            mounted = false;
        };
    }, []);

    const rangeStart = parseDateStart(startDate);
    const rangeEnd = parseDateEnd(endDate);

    const filterAlert = (alert) => {
        const byTransport = String(alert.transport_un || "").toLowerCase().includes(transportQuery.trim().toLowerCase());
        const byText = resolveAlertDescription(alert, alertTypeLookup).toLowerCase().includes(textQuery.trim().toLowerCase());
        const byStart = rangeStart == null ? true : alert.date_ts >= rangeStart;
        const byEnd = rangeEnd == null ? true : alert.date_ts <= rangeEnd;
        return byTransport && byText && byStart && byEnd;
    };

    const filteredActiveByGroup = useMemo(() => ({
        distance: activeData.distance.filter(filterAlert),
        no_docs_cords: activeData.no_docs_cords.filter(filterAlert),
        not_work: activeData.not_work.filter(filterAlert),
        no_equipment: activeData.no_equipment.filter(filterAlert),
        other: activeData.other.filter(filterAlert),
    }), [activeData, transportQuery, textQuery, rangeStart, rangeEnd, alertTypeLookup]);

    const activeItems = filteredActiveByGroup[activeTab] || [];
    const recentItems = useMemo(
        () => last100.items.filter(filterAlert),
        [last100.items, transportQuery, textQuery, rangeStart, rangeEnd, alertTypeLookup],
    );

    const openCommentModal = (alert) => {
        setEditingAlert(alert);
        setCommentDraft(alert?.comment || "");
    };

    const closeCommentModal = () => {
        if (savingComment) return;
        setEditingAlert(null);
        setCommentDraft("");
    };

    const patchCommentById = (alertId, nextComment, nextDateTimeEdit) => {
        const patchFn = (item) => (
            item.id === alertId
                ? { ...item, comment: nextComment, date_time_edit: nextDateTimeEdit }
                : item
        );

        setLast100((prev) => ({ ...prev, items: prev.items.map(patchFn) }));
        setActiveData((prev) => ({
            ...prev,
            distance: prev.distance.map(patchFn),
            no_docs_cords: prev.no_docs_cords.map(patchFn),
            not_work: prev.not_work.map(patchFn),
            no_equipment: prev.no_equipment.map(patchFn),
            other: prev.other.map(patchFn),
        }));
    };

    const saveComment = async () => {
        const id = editingAlert?.comment_id ?? editingAlert?.id;
        const trimmed = String(commentDraft || "").trim();
        if (!id) return;
        if (!trimmed || trimmed.length > 500) {
            flash.warning("Комментарий должен быть от 1 до 500 символов");
            return;
        }

        try {
            setSavingComment(true);
            const result = await editAlertComment({ commentId: id, comment: trimmed });
            const status = result?.status;
            if (status && status !== "edit_ok" && status !== "success") {
                flash.error(result?.message || "Не удалось сохранить комментарий");
                return;
            }
            patchCommentById(id, trimmed, new Date().toISOString());
            flash.success("Комментарий сохранен");
            closeCommentModal();
        } catch {
            flash.error("Не удалось сохранить комментарий");
        } finally {
            setSavingComment(false);
        }
    };

    return (
        <div className="vo-page h-100 overflow-hidden">
            <div className="vo-layout h-100">
                <aside className="vo-recent-panel">
                    <header className="vo-recent-header">
                        <h2>Последние уведомления</h2>
                    </header>

                    <div className="vo-recent-list custom-scrollbar">
                        {loadingRecent && <div className="text-center py-4"><div className="spinner-border text-primary" role="status" /></div>}
                        {!loadingRecent && recentItems.length === 0 && <div className="text-body-secondary">Нет уведомлений.</div>}
                        {!loadingRecent && recentItems.map((alert) => (
                            <a
                                key={`recent-${alert.id}`}
                                href={alert.transport_un ? `/car/${alert.transport_un}` : "#"}
                                className={`vo-recent-item ${getAlertToneClass(alert.type, alert.status)}`}
                                target={alert.transport_un ? "_blank" : undefined}
                                rel={alert.transport_un ? "noreferrer" : undefined}
                                onClick={(e) => {
                                    if (!alert.transport_un) e.preventDefault();
                                }}
                            >
                                <div className="vo-recent-item-top">
                                    <strong>{getAlertTransportUn(alert)}</strong>
                                    <small>{formatAlertDate(alert.date_raw)}</small>
                                </div>
                                <p>{resolveAlertDescription(alert, alertTypeLookup)}</p>
                            </a>
                        ))}
                    </div>
                </aside>

                <section className="vo-main-panel">
                    <header className="vo-main-header">
                        <div className="vo-main-title">
                            <h1>Виртуальный диспетчер</h1>
                            <small>Активных алертов: {activeData.total_active}</small>
                        </div>
                        <div className="vo-filters">
                            <input className="form-control" placeholder="Номер лота" value={transportQuery} onChange={(e) => setTransportQuery(e.target.value)} />
                            <input className="form-control" placeholder="Описание алерта" value={textQuery} onChange={(e) => setTextQuery(e.target.value)} />
                            <input type="date" className="form-control" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                            <input type="date" className="form-control" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                        </div>
                    </header>

                    <div className="vo-tabs">
                        {ALERT_GROUPS.map((group) => {
                            const count = (filteredActiveByGroup[group.key] || []).length;
                            return (
                                <button
                                    key={group.key}
                                    type="button"
                                    className={`vo-tab ${activeTab === group.key ? "active" : ""}`}
                                    onClick={() => setActiveTab(group.key)}
                                >
                                    <i className={`bi ${group.icon}`}></i>
                                    <span>{group.label}</span>
                                    <strong>{count}</strong>
                                </button>
                            );
                        })}
                    </div>

                    <div className="vo-cards custom-scrollbar">
                        {loadingActive && <div className="text-center py-4"><div className="spinner-border text-primary" role="status" /></div>}
                        {!loadingActive && activeItems.length === 0 && <div className="text-body-secondary">Нет активных алертов по фильтрам.</div>}
                        {!loadingActive && activeItems.map((alert) => (
                            <AlertCard
                                key={`active-${alert.id}`}
                                alert={alert}
                                alertTypeLookup={alertTypeLookup}
                                onCommentClick={openCommentModal}
                                carLink
                                compact
                            />
                        ))}
                    </div>
                </section>
            </div>

            {editingAlert && (
                <>
                    <div className="modal fade show d-block" tabIndex="-1" role="dialog" aria-modal="true">
                        <div className="modal-dialog modal-dialog-centered">
                            <div className="modal-content border-0">
                                <div className="modal-header">
                                    <h5 className="modal-title">Редактирование комментария</h5>
                                    <button type="button" className="btn-close" onClick={closeCommentModal} disabled={savingComment} />
                                </div>
                                <div className="modal-body">
                                    <p className="mb-2"><strong>ТС:</strong> {getAlertTransportUn(editingAlert)}</p>
                                    <p className="mb-2"><strong>Алерт:</strong> {resolveAlertDescription(editingAlert, alertTypeLookup)}</p>
                                    <textarea
                                        className="form-control"
                                        rows={4}
                                        maxLength={500}
                                        value={commentDraft}
                                        onChange={(e) => setCommentDraft(e.target.value)}
                                    />
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={closeCommentModal} disabled={savingComment}>Закрыть</button>
                                    <button type="button" className="btn btn-primary" onClick={saveComment} disabled={savingComment}>
                                        {savingComment ? "Сохранение..." : "Сохранить"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="modal-backdrop fade show" onClick={closeCommentModal}></div>
                </>
            )}
        </div>
    );
}
