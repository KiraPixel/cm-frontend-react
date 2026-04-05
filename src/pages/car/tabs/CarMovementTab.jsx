import { formatDateTime } from "../utils";
import { TrackPanel } from "../map/TrackPanel";

export function CarMovementTab({ lotNumber, mapState }) {
    return (
        <div className="car-movement-tab">
            <TrackPanel mapState={mapState} lotNumber={lotNumber} />

            <section className="car-panel-card">
                <header><h3>История точек</h3></header>
                <div className="car-panel-body car-history-table-wrap custom-scrollbar">
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
                            {mapState.filteredHistory.map((point, idx) => (
                                <tr key={idx}>
                                    <td>{formatDateTime(point.datetime || point.time || point.date)}</td>
                                    <td>{point.pos_x ?? "—"}</td>
                                    <td>{point.pos_y ?? "—"}</td>
                                    <td>{Number(point.valid_nav) === 1 ? "Да" : "Нет"}</td>
                                </tr>
                            ))}
                            {mapState.filteredHistory.length === 0 && (
                                <tr><td colSpan={4} className="text-body-secondary">Нет данных</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}
