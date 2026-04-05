import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { YandexMap } from "../../shared/ui/YandexMap";
import { api } from "../../shared/api/client";
import "./MapsPage.css";

const formatDateTime = (timestamp) => {
    if (!timestamp) return "-";
    return new Date(timestamp * 1000).toLocaleString("ru-RU", {
        day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit"
    });
};

const buildDeviceBalloonContent = (carNumber, device) => `
    <div style="font-family: Arial, sans-serif; min-width: 220px;">
        <div style="margin-bottom: 8px; font-size: 13px;">
            <span style="color: gray;">Устройство:</span> <b>${device.type || "-"}</b><br/>
            <span style="color: gray;">Номер блока:</span> <b>${device.block_number || "-"}</b><br/>
            <span style="color: gray;">Последний онлайн:</span> ${formatDateTime(device.last_time)}
        </div>
        <a href="/car/${carNumber}" target="_blank" style="display: inline-block; padding: 5px 10px; background-color: #0d6efd; color: white; text-decoration: none; border-radius: 4px; font-size: 12px;">
            Открыть карточку ТС
        </a>
    </div>
`;

export function MapsPage() {
    const [cars, setCars] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [isSidebarVisible, setIsSidebarVisible] = useState(true);
    const [displayLimit, setDisplayLimit] = useState(50);
    const listContainerRef = useRef(null);
    const [filters, setFilters] = useState({ type: "", region: "" });
    const [selectedDevices, setSelectedDevices] = useState({});
    const [expandedCars, setExpandedCars] = useState({});

    const yandexMapApiRef = useRef(null);

    const fetchCars = async () => {
        setLoading(true);
        try {
            const params = {};
            if (filters.type) params.type = filters.type;
            if (filters.region) params.region = filters.region;

            const { data } = await api.get("/car/all_monitoring_cars", { params });
            const carsData = Array.isArray(data) ? data : (data.data || []);
            setCars(carsData);
        } catch (error) {
            console.error("Ошибка загрузки данных:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setSelectedDevices({});
        fetchCars();
    }, [filters]);

    const filteredCars = useMemo(() => {
        if (!searchQuery) return cars;
        const lowerQuery = searchQuery.toLowerCase();
        return cars.filter(car => car.uNumber && car.uNumber.toLowerCase().includes(lowerQuery));
    }, [cars, searchQuery]);

    useEffect(() => {
        setDisplayLimit(50);
        if (listContainerRef.current) listContainerRef.current.scrollTop = 0;
    }, [searchQuery, cars]);

    const visibleCars = useMemo(() => filteredCars.slice(0, displayLimit), [filteredCars, displayLimit]);

    const handleScroll = useCallback((e) => {
        const { scrollTop, scrollHeight, clientHeight } = e.target;
        if (scrollHeight - scrollTop - clientHeight < 100) {
            setDisplayLimit(prev => Math.min(prev + 50, filteredCars.length));
        }
    }, [filteredCars.length]);

    const toggleDevice = (carNumber, deviceType, blockNumber) => {
        const key = `${carNumber}-${deviceType}-${blockNumber}`;
        setSelectedDevices(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const toggleAll = (state) => {
        if (!state) {
            setSelectedDevices({});
            return;
        }
        const newSelection = {};
        filteredCars.forEach(car => {
            if (car.devices) {
                car.devices.forEach(device => {
                    if (device.block_number && device.pos_x && device.pos_y) {
                        newSelection[`${car.uNumber}-${device.type}-${device.block_number}`] = true;
                    }
                });
            }
        });
        setSelectedDevices(newSelection);
    };

    const mapMarkers = useMemo(() => {
        const markers = [];
        filteredCars.forEach(car => {
            if (!car.devices) return;
            car.devices.forEach(device => {
                const key = `${car.uNumber}-${device.type}-${device.block_number}`;
                if (selectedDevices[key] && device.pos_x && device.pos_y) {
                    const clusterTitle = `${car.uNumber} - ${device.type || "-"}`;
                    markers.push({
                        id: key,
                        lat: device.pos_x,
                        lng: device.pos_y,
                        type: device.type === 'Cesar' ? 'orange' : 'blue',
                        title: clusterTitle,
                        clusterCaption: clusterTitle,
                        balloonHeader: clusterTitle,
                        description: buildDeviceBalloonContent(car.uNumber, device),
                        onClick: null 
                    });
                }
            });
        });
        return markers;
    }, [filteredCars, selectedDevices]);

    useEffect(() => {
        if (yandexMapApiRef.current && yandexMapApiRef.current.getMap()) {
            const timer = setTimeout(() => {
                yandexMapApiRef.current.getMap().container.fitToViewport();
            }, 150);
            return () => clearTimeout(timer);
        }
    }, [isSidebarVisible]);

    return (
        <div className="maps-page d-flex w-100 h-100 overflow-hidden position-relative bg-body">
            {isSidebarVisible && (
                <div className="d-flex flex-column border-end shadow-sm bg-body" style={{ width: "380px", height: "100%", zIndex: 1000, flexShrink: 0 }}>
                    <div className="p-3 border-bottom bg-body-tertiary flex-shrink-0">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <button className="btn btn-sm btn-outline-secondary map-contrast-btn" onClick={() => setIsSidebarVisible(false)} title="Скрыть список">
                                <i className="bi bi-chevron-left"></i>
                            </button>
                            <div className="d-flex gap-2">
                                <button className="btn btn-sm btn-outline-primary map-contrast-btn" onClick={fetchCars} title="Обновить">
                                    <i className="bi bi-arrow-clockwise"></i>
                                </button>
                                <button className="btn btn-sm btn-outline-secondary map-contrast-btn" data-bs-toggle="modal" data-bs-target="#filterModal" title="Фильтры">
                                    <i className="bi bi-funnel"></i>
                                </button>
                            </div>
                        </div>
                        <div className="input-group mb-2">
                            <span className="input-group-text bg-body border-end-0"><i className="bi bi-search text-muted"></i></span>
                            <input type="text" className="form-control border-start-0 bg-body text-body" placeholder="Поиск по машинам..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                        </div>
                        <div className="d-flex gap-2">
                            <button className="btn btn-sm btn-outline-success flex-grow-1 map-contrast-btn" onClick={() => toggleAll(true)}>
                                <i className="bi bi-check-all me-1"></i>Все
                            </button>
                            <button className="btn btn-sm btn-outline-danger flex-grow-1" onClick={() => toggleAll(false)}>
                                <i className="bi bi-x-lg me-1"></i>Сброс
                            </button>
                        </div>
                    </div>
                    <div className="flex-grow-1 overflow-auto custom-scrollbar bg-body-secondary" ref={listContainerRef} onScroll={handleScroll}>
                        {loading && <div className="text-center p-5"><div className="spinner-border text-primary" role="status"></div><div className="mt-2 text-muted">Загрузка объектов...</div></div>}
                        {!loading && visibleCars.length === 0 && <div className="text-center p-5 text-muted"><i className="bi bi-search fs-1"></i><p className="mt-2">Машины не найдены</p></div>}
                        <ul className="list-unstyled p-2 m-0">
                            {visibleCars.map(car => (
                                <li key={car.uNumber} className="mb-2">
                                    <div className="card border-0 shadow-sm bg-body text-body">
                                        <div className="card-body p-2 d-flex align-items-center justify-content-between">
                                            <div className="d-flex align-items-center overflow-hidden">
                                                <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-2 flex-shrink-0" style={{width: '32px', height: '32px'}}>
                                                    <i className="bi bi-car-front-fill"></i>
                                                </div>
                                                <span className="fw-bold text-truncate">{car.uNumber}</span>
                                            </div>
                                            <div className="d-flex align-items-center">
                                                <a href={`/car/${car.uNumber}`} target="_blank" rel="noreferrer" className="btn btn-light btn-sm me-1 text-primary bg-body-tertiary border-0" title="Карточка">
                                                    <i className="bi bi-box-arrow-up-right"></i>
                                                </a>
                                                <button className={`btn btn-sm transition-transform map-expand-btn ${expandedCars[car.uNumber] ? 'map-expand-btn-active' : 'btn-light bg-body-tertiary border-0'}`} onClick={() => setExpandedCars(prev => ({ ...prev, [car.uNumber]: !prev[car.uNumber] }))}>
                                                    <i className={`bi bi-chevron-${expandedCars[car.uNumber] ? 'up' : 'down'}`}></i>
                                                </button>
                                            </div>
                                        </div>
                                        {expandedCars[car.uNumber] && (
                                            <div className="card-footer bg-body border-top p-0">
                                                {car.devices && car.devices.length > 0 ? (
                                                    <div className="list-group list-group-flush">
                                                        {car.devices.map((device, idx) => {
                                                            const deviceKey = `${car.uNumber}-${device.type}-${device.block_number}`;
                                                            const isSelected = !!selectedDevices[deviceKey];
                                                            const hasCoords = device.pos_x && device.pos_y;
                                                            return (
                                                                <label key={deviceKey} className={`list-group-item list-group-item-action d-flex align-items-center p-2 border-0 bg-body text-body ${!hasCoords ? 'opacity-50' : ''}`} style={{ cursor: hasCoords ? 'pointer' : 'default' }}>
                                                                    <input className="form-check-input me-3 mt-0" type="checkbox" checked={isSelected} onChange={() => toggleDevice(car.uNumber, device.type, device.block_number)} disabled={!hasCoords} />
                                                                    <div className="flex-grow-1">
                                                                        <div className="d-flex justify-content-between">
                                                                            <span className="fw-semibold">{device.type}</span>
                                                                            {!hasCoords && <span className="badge bg-secondary">Нет GPS</span>}
                                                                        </div>
                                                                        <div className="text-muted small"><i className="bi bi-clock me-1"></i>{formatDateTime(device.last_time)}</div>
                                                                    </div>
                                                                </label>
                                                            );
                                                        })}
                                                    </div>
                                                ) : (<div className="p-2 text-center text-muted small">Нет устройств</div>)}
                                            </div>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                        {visibleCars.length < filteredCars.length && <div className="text-center p-2 text-muted small">Загрузка списка...</div>}
                    </div>
                </div>
            )}
            {!isSidebarVisible && (
                <button className="btn btn-primary position-absolute shadow d-flex align-items-center justify-content-center" style={{ top: "50px", left: "20px", zIndex: 1001, borderRadius: "50%", width: "50px", height: "50px" }} onClick={() => setIsSidebarVisible(true)} title="Показать список">
                    <i className="bi bi-list fs-4"></i>
                </button>
            )}
            {/* Добавил minWidth: 0, чтобы flex-элемент мог сжиматься меньше контента */}
            <div className="flex-grow-1 h-100 bg-body-tertiary position-relative" style={{ minWidth: 0 }}>
                <YandexMap 
                    markers={mapMarkers} 
                    zoom={10} 
                    center={[55.75, 37.57]} 
                    onMapLoad={(api) => { yandexMapApiRef.current = api; }}
                />
            </div>
            <div className="modal fade" id="filterModal" tabIndex="-1" aria-hidden="true">
                <div className="modal-dialog modal-dialog-centered">
                    <div className="modal-content bg-body text-body">
                        <div className="modal-header border-bottom-0">
                            <h5 className="modal-title">Фильтры</h5>
                            <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div className="modal-body">
                            <div className="mb-3">
                                <label className="form-label">Тип техники</label>
                                <select className="form-select bg-body text-body" name="type" value={filters.type} onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}>
                                    <option value="">Все</option>
                                    <option value="ПО">ПО</option>
                                    <option value="ПТО">ПТО</option>
                                </select>
                            </div>
                            <div className="mb-3">
                                <label className="form-label">Регион</label>
                                <input type="text" className="form-control bg-body text-body" name="region" value={filters.region} onChange={(e) => setFilters(prev => ({ ...prev, region: e.target.value }))} placeholder="Например: Москва" />
                            </div>
                        </div>
                        <div className="modal-footer border-top-0">
                            <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">Отмена</button>
                            <button type="button" className="btn btn-primary" data-bs-dismiss="modal" onClick={() => { setSelectedDevices({}); fetchCars(); }}>Применить</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}


