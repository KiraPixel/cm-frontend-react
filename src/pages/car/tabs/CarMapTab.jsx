import { formatDateTime } from "../utils";

export function CarMapTab({ mapState }) {
    const points = mapState.filteredHistory.length;

    return (
        <section className="car-panel-card">
            <header><h3>Карта</h3></header>
            <div className="car-panel-body">
                <div className="d-flex justify-content-between align-items-center">
                    <div className="text-body-secondary">Единая карта ТС и мониторинга</div>
                    <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => mapState.setTrackPanelOpen(true)}>
                        <i className="bi bi-activity me-1"></i>
                        Панель трека
                    </button>
                </div>

                <div className="mt-3 car-map-meta-grid">
                    <div className="car-map-meta-item">
                        <span>Точек трека</span>
                        <strong>{points}</strong>
                    </div>
                    <div className="car-map-meta-item">
                        <span>Режим</span>
                        <strong>{mapState.hasRoute ? "С треком" : "Без трека"}</strong>
                    </div>
                </div>

                {points > 0 && (
                    <div className="mt-3 car-history-table-wrap custom-scrollbar">
                        <table className="table table-sm align-middle mb-0">
                            <thead>
                                <tr>
                                    <th>Время</th>
                                    <th>X</th>
                                    <th>Y</th>
                                    <th>Валидно</th>
                                </tr>
                            </thead>
                            <tbody>
                                {mapState.filteredHistory.slice(0, 50).map((point, idx) => (
                                    <tr key={idx}>
                                        <td>{formatDateTime(point.datetime || point.time || point.date)}</td>
                                        <td>{point.pos_x ?? "—"}</td>
                                        <td>{point.pos_y ?? "—"}</td>
                                        <td>{Number(point.valid_nav) === 1 ? "Да" : "Нет"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </section>
    );
}
