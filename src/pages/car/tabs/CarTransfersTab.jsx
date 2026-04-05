import { formatDateTime, formatNullable } from "../utils";

const getTransferIcon = (type) => {
    switch (type) {
        case "Перемещение по складу":
            return "bi-truck";
        case "Изменение менеджера":
            return "bi-person";
        case "Изменение клиента":
            return "bi-building";
        default:
            return "bi-arrow-left-right";
    }
};

export function CarTransfersTab({ transfers = [] }) {
    if (!transfers.length) {
        return (
            <section className="car-panel-card">
                <header><h3>Перемещения</h3></header>
                <div className="car-panel-body text-body-secondary">История изменений отсутствует.</div>
            </section>
        );
    }

    return (
        <section className="car-panel-card">
            <header><h3>Перемещения</h3></header>
            <div className="car-panel-body car-timeline-wrap custom-scrollbar">
                <div className="car-timeline">
                    {transfers.map((item, index) => (
                        <article key={`${item.id || item.date || "transfer"}-${index}`} className="car-timeline-item">
                            <div className="car-timeline-icon">
                                <i className={`bi ${getTransferIcon(item.type)}`}></i>
                            </div>
                            <div className="car-timeline-content">
                                <div className="car-transfer-head">
                                    <strong>{formatNullable(item.type)}</strong>
                                    <small className="text-body-secondary">{formatDateTime(item.date)}</small>
                                </div>
                                <div className="car-transfer-grid">
                                    <div>
                                        <span className="text-body-secondary">Новое значение</span>
                                        <div>{formatNullable(item.new_value)}</div>
                                    </div>
                                    <div>
                                        <span className="text-body-secondary">Старое значение</span>
                                        <div>{formatNullable(item.old_value)}</div>
                                    </div>
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            </div>
        </section>
    );
}
