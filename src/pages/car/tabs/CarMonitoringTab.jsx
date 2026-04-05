import { formatNullable } from "../utils";

const groupByType = (items) => {
    const groups = {
        axenta: [],
        cesar: [],
        wialon: [],
        other: [],
    };

    items.forEach((item) => {
        const type = String(item?.type || "").toLowerCase();
        if (type in groups) {
            groups[type].push(item);
            return;
        }
        groups.other.push(item);
    });

    return groups;
};

function MonitoringGroup({ title, items }) {
    if (!items.length) return null;

    return (
        <section className="car-panel-card">
            <header><h3>{title}</h3></header>
            <div className="car-panel-body car-monitoring-grid">
                {items.map((item, index) => (
                    <article key={`${item.uid || item.pin || title}-${index}`} className="car-monitoring-card">
                        <div className="car-monitoring-head">
                            <strong>{formatNullable(item.uid || item.pin)}</strong>
                            <span className={`badge ${item.online === "Online" ? "text-bg-success" : "text-bg-secondary"}`}>
                                {formatNullable(item.online || "Offline")}
                            </span>
                        </div>
                        <div className="car-monitoring-row"><span>Последнее обновление</span><strong>{formatNullable(item.last_time)}</strong></div>
                        <div className="car-monitoring-row"><span>X</span><strong>{formatNullable(item.pos_x)}</strong></div>
                        <div className="car-monitoring-row"><span>Y</span><strong>{formatNullable(item.pos_y)}</strong></div>
                        <div className="car-monitoring-row"><span>Адрес</span><strong>{formatNullable(item.address)}</strong></div>
                        {item.engine_hours != null && <div className="car-monitoring-row"><span>Моточасы</span><strong>{formatNullable(item.engine_hours)}</strong></div>}
                        {item.engine_hours_day != null && <div className="car-monitoring-row"><span>Моточасы/день</span><strong>{formatNullable(item.engine_hours_day)}</strong></div>}
                        {item.axenta_satellite_count != null && <div className="car-monitoring-row"><span>Спутники</span><strong>{formatNullable(item.axenta_satellite_count)}</strong></div>}
                    </article>
                ))}
            </div>
        </section>
    );
}

export function CarMonitoringTab({ monitoring = [] }) {
    if (!monitoring.length) {
        return (
            <section className="car-panel-card">
                <header><h3>Оборудование</h3></header>
                <div className="car-panel-body text-body-secondary">Данные мониторинга отсутствуют.</div>
            </section>
        );
    }

    const grouped = groupByType(monitoring);

    return (
        <div className="car-monitoring-layout">
            <MonitoringGroup title="Axenta" items={grouped.axenta} />
            <MonitoringGroup title="Cesar" items={grouped.cesar} />
            <MonitoringGroup title="Wialon" items={grouped.wialon} />
            <MonitoringGroup title="Другое оборудование" items={grouped.other} />
        </div>
    );
}
