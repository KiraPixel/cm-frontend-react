import {
    formatAlertDate,
    getAlertCommentText,
    getAlertToneClass,
    getAlertTransportModel,
    getAlertTransportUn,
    resolveAlertDescription,
} from "./alertTypeController";

export function AlertCard({
    alert,
    alertTypeLookup,
    onCommentClick,
    carLink = true,
    compact = true,
}) {
    const toneClass = getAlertToneClass(alert.type, alert.status);
    const transportUn = getAlertTransportUn(alert);
    const transportModel = getAlertTransportModel(alert);
    const description = resolveAlertDescription(alert, alertTypeLookup);

    return (
        <article className={`vo-alert-card ${toneClass} ${compact ? "is-compact" : ""}`}>
            <div className="vo-alert-head">
                {carLink && alert.transport_un ? (
                    <a href={`/car/${alert.transport_un}`} target="_blank" rel="noreferrer">
                        {transportUn}
                    </a>
                ) : (
                    <span className="fw-semibold">{transportUn}</span>
                )}
                <small>{formatAlertDate(alert.date_raw)}</small>
            </div>

            <p className="vo-alert-description">{description}</p>

            <div className="vo-alert-bottom-row">
                <small className="vo-alert-model" title={transportModel}>
                    {transportModel}
                </small>

                <small
                    className={`vo-alert-comment-preview text-body-secondary ${alert.comment ? "has-comment" : ""}`}
                    title={alert.comment ? getAlertCommentText(alert) : "Комментарий не добавлен"}
                >
                    {alert.comment ? getAlertCommentText(alert) : "—"}
                    {alert.comment && alert.date_time_edit ? ` • ${formatAlertDate(alert.date_time_edit)}` : ""}
                </small>

                <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => onCommentClick?.(alert)}
                    title="Редактировать комментарий"
                >
                    <i className={`bi ${alert.comment ? "bi-chat-right-dots" : "bi-chat-right"}`}></i>
                </button>
            </div>
        </article>
    );
}
