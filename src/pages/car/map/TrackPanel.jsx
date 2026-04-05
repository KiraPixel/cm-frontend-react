const monitoringSystems = ["", "Wialon", "Cesar", "Axenta"];

export function TrackPanel({ mapState, lotNumber, onClose }) {
    const {
        availableBlocks,
        monitoringSystem,
        blockNumber,
        dateFrom,
        dateTo,
        validNavOnly,
        loadingTrack,
        setDateFrom,
        setDateTo,
        setMonitoringSystem,
        setBlockNumber,
        setValidNavOnly,
        applyTrack,
        clearTrack,
    } = mapState;

    const apply = async () => {
        await applyTrack(lotNumber);
    };

    return (
        <div className="car-track-panel card shadow-sm">
            <div className="card-body">
                <div className="d-flex justify-content-between align-items-center mb-2">
                    <strong>Трек</strong>
                    {onClose && (
                        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={onClose}>
                            <i className="bi bi-x-lg"></i>
                        </button>
                    )}
                </div>

                <div className="car-track-grid">
                    <div>
                        <label className="form-label">Дата и время от</label>
                        <input type="datetime-local" className="form-control" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                    </div>
                    <div>
                        <label className="form-label">Дата и время до</label>
                        <input type="datetime-local" className="form-control" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                    </div>
                    <div>
                        <label className="form-label">Система</label>
                        <select className="form-select" value={monitoringSystem} onChange={(e) => { setMonitoringSystem(e.target.value); setBlockNumber(""); }}>
                            {monitoringSystems.map((sys) => <option key={sys || "all"} value={sys}>{sys || "Все"}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="form-label">Номер блока</label>
                        <select className="form-select" value={blockNumber} onChange={(e) => setBlockNumber(e.target.value)}>
                            <option value="">Все</option>
                            {availableBlocks.map((block) => <option key={block} value={block}>{block}</option>)}
                        </select>
                    </div>
                    <div className="form-check car-valid-check">
                        <input id="valid-nav-overlay" type="checkbox" className="form-check-input" checked={validNavOnly} onChange={(e) => setValidNavOnly(e.target.checked)} />
                        <label htmlFor="valid-nav-overlay" className="form-check-label">Только валидная навигация</label>
                    </div>
                </div>

                <div className="car-movement-actions mt-2">
                    <button type="button" className="btn btn-primary btn-sm" onClick={apply} disabled={loadingTrack}>{loadingTrack ? "Загрузка..." : "Нарисовать"}</button>
                    <button type="button" className="btn btn-outline-secondary btn-sm" onClick={clearTrack}>Очистить</button>
                </div>
            </div>
        </div>
    );
}
