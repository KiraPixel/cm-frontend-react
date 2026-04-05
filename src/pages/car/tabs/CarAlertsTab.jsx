import { useEffect, useMemo, useState } from "react";
import { useFlash } from "../../../shared/flash/FlashProvider";
import { AlertCard } from "../../../shared/alerts/AlertCard";
import {
    buildAlertTypeLookup,
    editAlertComment,
    loadAlertTypes,
    normalizeAlert,
} from "../../../shared/alerts/alertTypeController";

const mapCarAlert = (alert) => {
    const normalized = normalizeAlert(alert);
    const localization = String(alert?.localization || "").trim();
    const data = alert?.data != null ? String(alert.data) : "";
    return {
        ...normalized,
        description: localization ? `${localization}${data ? ` ${data}` : ""}` : normalized.description,
    };
};

export function CarAlertsTab({ alerts = [], onRefresh }) {
    const flash = useFlash();
    const [alertTypeLookup, setAlertTypeLookup] = useState({});
    const [editingAlert, setEditingAlert] = useState(null);
    const [commentDraft, setCommentDraft] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        let mounted = true;
        loadAlertTypes().then((types) => {
            if (!mounted) return;
            setAlertTypeLookup(buildAlertTypeLookup(types));
        });
        return () => {
            mounted = false;
        };
    }, []);

    const items = useMemo(() => (Array.isArray(alerts) ? alerts.map(mapCarAlert) : []), [alerts]);

    const openEditor = (alert) => {
        setEditingAlert(alert);
        setCommentDraft(alert.comment || "");
    };

    const closeEditor = () => {
        if (saving) return;
        setEditingAlert(null);
        setCommentDraft("");
    };

    const saveComment = async () => {
        const commentId = editingAlert?.comment_id ?? editingAlert?.id;
        const trimmed = commentDraft.trim();

        if (!commentId || !trimmed || trimmed.length > 500) {
            flash.warning("Комментарий должен быть от 1 до 500 символов");
            return;
        }

        try {
            setSaving(true);
            const result = await editAlertComment({ commentId, comment: trimmed });
            if (result?.status !== "edit_ok" && result?.status !== "success") {
                flash.error(result?.message || "Не удалось сохранить комментарий");
                return;
            }
            flash.success("Комментарий сохранен");
            closeEditor();
            onRefresh?.();
        } catch {
            flash.error("Не удалось сохранить комментарий");
        } finally {
            setSaving(false);
        }
    };

    return (
        <section className="car-panel-card">
            <header><h3>Алерты</h3></header>
            <div className="car-panel-body">
                <div className="car-alerts-grid">
                    {items.length === 0 && <div className="text-body-secondary">По этой ТС нет уведомлений.</div>}

                    {items.map((alert) => (
                        <AlertCard
                            key={alert.id || `${alert.type}-${alert.date_raw}`}
                            alert={alert}
                            alertTypeLookup={alertTypeLookup}
                            onCommentClick={openEditor}
                            carLink={false}
                            compact={false}
                        />
                    ))}
                </div>
            </div>

            {editingAlert && (
                <>
                    <div className="modal fade show d-block" tabIndex="-1" role="dialog" aria-modal="true">
                        <div className="modal-dialog modal-dialog-centered">
                            <div className="modal-content border-0">
                                <div className="modal-header">
                                    <h5 className="modal-title">Редактирование комментария</h5>
                                    <button type="button" className="btn-close" onClick={closeEditor} disabled={saving} />
                                </div>
                                <div className="modal-body">
                                    <textarea
                                        className="form-control"
                                        rows={4}
                                        maxLength={500}
                                        value={commentDraft}
                                        onChange={(e) => setCommentDraft(e.target.value)}
                                    />
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={closeEditor} disabled={saving}>Закрыть</button>
                                    <button type="button" className="btn btn-primary" onClick={saveComment} disabled={saving}>
                                        {saving ? "Сохранение..." : "Сохранить"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="modal-backdrop fade show" onClick={closeEditor}></div>
                </>
            )}
        </section>
    );
}
