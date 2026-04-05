import { useEffect, useState } from "react";
import { useAuth } from "../../../features/auth/AuthContext";
import { useFlash } from "../../../shared/flash/FlashProvider";
import { addCarComment, editCarComment } from "../api";
import { formatDateTime } from "../utils";

export function CarCommentsTab({ lotNumber, comments = [], onSyncComments, embedded = false }) {
    const { user } = useAuth();
    const flash = useFlash();

    const [items, setItems] = useState(Array.isArray(comments) ? comments : []);
    const [draft, setDraft] = useState("");
    const [saving, setSaving] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [editingText, setEditingText] = useState("");

    useEffect(() => {
        setItems(Array.isArray(comments) ? comments : []);
    }, [comments, lotNumber]);

    const submit = async (event) => {
        event.preventDefault();

        const text = draft.trim();
        if (!text || text.length > 500) {
            flash.warning("Комментарий должен быть от 1 до 500 символов");
            return;
        }

        try {
            setSaving(true);
            const result = await addCarComment({ uNumber: lotNumber, text });
            if (result?.status !== "comment_ok" && result?.status !== "success") {
                flash.error(result?.message || "Не удалось добавить комментарий");
                return;
            }

            const newComment = {
                id: `tmp-${Date.now()}`,
                author: user?.user || "—",
                datetime: new Date().toISOString(),
                text,
            };

            setItems((prev) => [newComment, ...prev]);
            setDraft("");
            if (onSyncComments) {
                const synced = await onSyncComments();
                if (Array.isArray(synced)) {
                    setItems(synced);
                }
            }
            flash.success("Комментарий добавлен");
        } catch {
            flash.error("Не удалось добавить комментарий");
        } finally {
            setSaving(false);
        }
    };

    const startEdit = (comment) => {
        setEditingId(comment.id);
        setEditingText(comment.text || "");
    };

    const saveEdit = async (commentId) => {
        const text = editingText.trim();
        if (!text || text.length > 500) {
            flash.warning("Комментарий должен быть от 1 до 500 символов");
            return;
        }

        try {
            const result = await editCarComment({ commentId, text });
            if (result?.status !== "edit_ok" && result?.status !== "success") {
                flash.error(result?.message || "Не удалось сохранить комментарий");
                return;
            }

            setItems((prev) => prev.map((item) => (
                item.id === commentId ? { ...item, text, datetime: new Date().toISOString() } : item
            )));
            if (onSyncComments) {
                const synced = await onSyncComments();
                if (Array.isArray(synced)) {
                    setItems(synced);
                }
            }
            setEditingId(null);
            setEditingText("");
            flash.success("Комментарий сохранен");
        } catch {
            flash.error("Не удалось сохранить комментарий");
        }
    };

    const removeComment = async (commentId) => {
        try {
            const result = await editCarComment({ commentId, action: "delete" });
            if (result?.status !== "edit_ok" && result?.status !== "success") {
                flash.error(result?.message || "Не удалось удалить комментарий");
                return;
            }

            setItems((prev) => prev.filter((item) => item.id !== commentId));
            if (onSyncComments) {
                const synced = await onSyncComments();
                if (Array.isArray(synced)) {
                    setItems(synced);
                }
            }
            flash.success("Комментарий удален");
        } catch {
            flash.error("Не удалось удалить комментарий");
        }
    };

    const commentsList = (
        <div className={`car-comments-list custom-scrollbar ${embedded ? "is-embedded" : ""}`}>
            {items.length === 0 && <div className="text-body-secondary">Пока нет комментариев.</div>}

            {items.map((comment) => {
                const canManage = comment.author === user?.user;

                return (
                    <article key={comment.id} className="car-comment-card">
                        <div className="car-comment-head">
                            <strong>{comment.author || "—"}</strong>
                            <small className="text-body-secondary">{formatDateTime(comment.datetime || comment.date)}</small>
                        </div>

                        {editingId === comment.id ? (
                            <textarea
                                className="form-control"
                                rows={3}
                                value={editingText}
                                onChange={(e) => setEditingText(e.target.value)}
                            />
                        ) : (
                            <div className="car-comment-text">{comment.text || "—"}</div>
                        )}

                        <div className="car-comment-actions">
                            {editingId === comment.id ? (
                                <>
                                    <button type="button" className="btn btn-sm btn-primary" onClick={() => saveEdit(comment.id)}>Сохранить</button>
                                    <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setEditingId(null)}>Отмена</button>
                                </>
                            ) : canManage ? (
                                <>
                                    <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => startEdit(comment)}>Редактировать</button>
                                    <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => removeComment(comment.id)}>Удалить</button>
                                </>
                            ) : null}
                        </div>
                    </article>
                );
            })}
        </div>
    );

    const commentForm = (
        <form onSubmit={submit} className={embedded ? "car-comments-embedded-form" : ""}>
            <textarea
                className="form-control"
                rows={embedded ? 3 : 4}
                placeholder="Введите комментарий"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                required
            />
            <div className="mt-2 d-flex justify-content-end">
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Сохранение..." : "Добавить"}</button>
            </div>
        </form>
    );

    if (embedded) {
        return (
            <div className="car-comments-embedded">
                {commentsList}
                {commentForm}
            </div>
        );
    }

    return (
        <div className="car-comments-layout">
            <section className="car-panel-card">
                <header><h3>Комментарии</h3></header>
                <div className="car-panel-body">{commentsList}</div>
            </section>

            <section className="car-panel-card">
                <header><h3>Добавить комментарий</h3></header>
                <div className="car-panel-body">{commentForm}</div>
            </section>
        </div>
    );
}
