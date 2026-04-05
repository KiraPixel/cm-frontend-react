import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../../shared/api/client";
import { useFlash } from "../../../shared/flash/FlashProvider";
import { unwrapData } from "../utils";
import { YandexMap } from "../../../shared/ui/YandexMap";

const emptyForm = { name: "", x_coord: "", y_coord: "", radius: "" };
const defaultCenter = [55.7558, 37.6176];

const normalizeStorage = (item) => ({
    id: item?.id,
    name: item?.named || item?.name || "Склад",
    x: item?.pos_x ?? item?.x_coord ?? "",
    y: item?.pos_y ?? item?.y_coord ?? "",
    radius: item?.radius ?? "",
    address: item?.address || "",
});

const toNumber = (value) => {
    if (value == null || value === "") return null;
    if (typeof value === "number") return Number.isFinite(value) ? value : null;

    const cleaned = String(value)
        .trim()
        .replace(",", ".")
        .replace(/[^\d.\-]+/g, "");
    const num = Number(cleaned);
    return Number.isFinite(num) ? num : null;
};

const resolveCoords = (x, y) => {
    const a = toNumber(x);
    const b = toNumber(y);
    if (a == null || b == null) return null;

    const firstLooksLikeLatLng = Math.abs(a) <= 90 && Math.abs(b) <= 180;
    if (firstLooksLikeLatLng) return [a, b];

    const secondLooksLikeLatLng = Math.abs(b) <= 90 && Math.abs(a) <= 180;
    if (secondLooksLikeLatLng) return [b, a];

    return null;
};

const getCenterFromCoords = (x, y) => {
    const coords = resolveCoords(x, y);
    return coords || defaultCenter;
};

export function AdminStoragesTab() {
    const flash = useFlash();

    const [loading, setLoading] = useState(false);
    const [storages, setStorages] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");

    const [panelMode, setPanelMode] = useState(null);
    const [activeStorage, setActiveStorage] = useState(null);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [showPickerMap, setShowPickerMap] = useState(false);

    const pickerMapApiRef = useRef(null);
    const pickerMapClickHandlerRef = useRef(null);
    const singleViewMapApiRef = useRef(null);
    const allViewMapApiRef = useRef(null);

    const filteredStorages = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return storages;
        return storages.filter((item) => {
            const name = String(item.name || "").toLowerCase();
            const address = String(item.address || "").toLowerCase();
            return name.includes(query) || address.includes(query);
        });
    }, [searchQuery, storages]);

    const pickerCenter = useMemo(() => getCenterFromCoords(form.x_coord, form.y_coord), [form.x_coord, form.y_coord]);
    const pickerZoom = useMemo(() => {
        const hasCoords = toNumber(form.x_coord) != null && toNumber(form.y_coord) != null;
        if (hasCoords) return 12;
        return panelMode === "create" ? 5 : 10;
    }, [form.x_coord, form.y_coord, panelMode]);

    const pickerMarkers = useMemo(() => {
        const coords = resolveCoords(form.x_coord, form.y_coord);
        if (!coords) return [];
        const [lat, lng] = coords;
        return [{ lat, lng, title: "Координаты склада", type: "blue" }];
    }, [form.x_coord, form.y_coord]);

    const pickerCircles = useMemo(() => {
        const coords = resolveCoords(form.x_coord, form.y_coord);
        const radiusKm = toNumber(form.radius);
        if (!coords || radiusKm == null || radiusKm <= 0) return [];
        const [lat, lng] = coords;
        return [{ lat, lng, radius: radiusKm * 1000, title: "Радиус склада" }];
    }, [form.x_coord, form.y_coord, form.radius]);

    const mapViewMarkers = useMemo(() => {
        if (panelMode !== "map" || !activeStorage) return [];
        const coords = resolveCoords(activeStorage.x, activeStorage.y);
        if (!coords) return [];
        const [lat, lng] = coords;
        return [{ lat, lng, title: activeStorage.name, type: "blue" }];
    }, [panelMode, activeStorage]);

    const mapViewCircles = useMemo(() => {
        if (panelMode !== "map" || !activeStorage) return [];
        const coords = resolveCoords(activeStorage.x, activeStorage.y);
        const radiusKm = toNumber(activeStorage.radius);
        if (!coords || radiusKm == null || radiusKm <= 0) return [];
        const [lat, lng] = coords;
        return [{ lat, lng, radius: radiusKm * 1000, title: activeStorage.name }];
    }, [panelMode, activeStorage]);

    const mapViewCenter = useMemo(() => {
        if (panelMode !== "map" || !activeStorage) return defaultCenter;
        return getCenterFromCoords(activeStorage.x, activeStorage.y);
    }, [panelMode, activeStorage]);

    const allMapMarkers = useMemo(() => {
        return storages
            .map((storage) => {
                const coords = resolveCoords(storage.x, storage.y);
                if (!coords) return null;
                const [lat, lng] = coords;
                return {
                    id: storage.id,
                    lat,
                    lng,
                    title: storage.name,
                    type: "blue",
                };
            })
            .filter(Boolean);
    }, [storages]);

    const allMapCircles = useMemo(() => {
        return storages
            .map((storage) => {
                const coords = resolveCoords(storage.x, storage.y);
                const radiusKm = toNumber(storage.radius);
                if (!coords || radiusKm == null || radiusKm <= 0) return null;
                const [lat, lng] = coords;
                return {
                    id: storage.id,
                    lat,
                    lng,
                    radius: radiusKm * 1000,
                    title: storage.name,
                };
            })
            .filter(Boolean);
    }, [storages]);

    const loadStorages = async () => {
        setLoading(true);
        try {
            const { data } = await api.get("/admin/storage/");
            const list = unwrapData(data).map(normalizeStorage);
            setStorages(list);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadStorages();
    }, []);

    const closePanel = () => {
        setPanelMode(null);
        setActiveStorage(null);
        setForm(emptyForm);
        setShowPickerMap(false);
    };

    const openCreate = () => {
        setPanelMode("create");
        setActiveStorage(null);
        setForm(emptyForm);
        setShowPickerMap(false);
    };

    const openEdit = (storage) => {
        setPanelMode("edit");
        setActiveStorage(storage);
        setForm({
            name: storage.name || "",
            x_coord: storage.x ?? "",
            y_coord: storage.y ?? "",
            radius: storage.radius ?? "",
        });
        setShowPickerMap(false);
    };

    const openMapView = (storage) => {
        setPanelMode("map");
        setActiveStorage(storage);
        setShowPickerMap(false);
    };

    const openAllMapView = () => {
        setPanelMode("all-map");
        setActiveStorage(null);
        setShowPickerMap(false);
    };

    const handleField = (key, value) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const saveStorage = async (event) => {
        event.preventDefault();
        const body = new FormData();
        body.append("name", String(form.name).trim());
        body.append("x_coord", String(form.x_coord).trim());
        body.append("y_coord", String(form.y_coord).trim());
        body.append("radius", String(form.radius).trim());

        setSaving(true);
        try {
            if (panelMode === "edit" && activeStorage?.id != null) {
                await api.put(`/admin/storage/edit/${activeStorage.id}`, body);
                flash.success("Склад обновлен");
            } else {
                await api.post("/admin/storage/add", body);
                flash.success("Склад добавлен");
            }

            closePanel();
            await loadStorages();
        } finally {
            setSaving(false);
        }
    };

    const removeStorage = async (storage) => {
        const approved = window.confirm(`Удалить склад "${storage.name}"?`);
        if (!approved) return;

        await api.delete(`/admin/storage/delete/${storage.id}`);
        flash.success("Склад удален");
        if (activeStorage?.id === storage.id) closePanel();
        await loadStorages();
    };

    const copyAddress = async (address) => {
        if (!address) return;
        try {
            await navigator.clipboard.writeText(address);
            flash.success("Адрес скопирован");
        } catch {
            flash.error("Не удалось скопировать адрес");
        }
    };

    const handlePickerMapLoad = (mapApi) => {
        pickerMapApiRef.current = mapApi;
        const map = mapApi.getMap();

        if (pickerMapClickHandlerRef.current) {
            map.events.remove("click", pickerMapClickHandlerRef.current);
        }

        const clickHandler = (event) => {
            const coords = event.get("coords") || [];
            if (coords.length < 2) return;
            handleField("x_coord", Number(coords[0]).toFixed(7));
            handleField("y_coord", Number(coords[1]).toFixed(7));
        };

        pickerMapClickHandlerRef.current = clickHandler;
        map.events.add("click", clickHandler);
    };

    useEffect(() => {
        if (!showPickerMap || !pickerMapApiRef.current) return;
        pickerMapApiRef.current.setCenter(pickerCenter);
    }, [pickerCenter, showPickerMap]);

    const handleSingleMapLoad = (mapApi) => {
        singleViewMapApiRef.current = mapApi;
    };

    const handleAllMapLoad = (mapApi) => {
        allViewMapApiRef.current = mapApi;
    };

    useEffect(() => {
        if (panelMode !== "map" || !singleViewMapApiRef.current) return;
        const timer = setTimeout(() => {
            const map = singleViewMapApiRef.current?.getMap?.();
            if (!map) return;
            map.container.fitToViewport();
            singleViewMapApiRef.current.setBounds();
        }, 260);

        return () => clearTimeout(timer);
    }, [panelMode, activeStorage?.id, mapViewMarkers.length, mapViewCircles.length]);

    useEffect(() => {
        if (panelMode !== "all-map" || !allViewMapApiRef.current) return;
        const timer = setTimeout(() => {
            const map = allViewMapApiRef.current?.getMap?.();
            if (!map) return;
            map.container.fitToViewport();
            allViewMapApiRef.current.setBounds();
        }, 260);

        return () => clearTimeout(timer);
    }, [panelMode, allMapMarkers.length, allMapCircles.length]);

    return (
        <section className={`admin-users-workspace ${panelMode ? "is-panel-open" : ""} ${(panelMode === "map" || panelMode === "all-map") ? "is-transport-focus" : ""}`}>
            <div className="admin-users-card admin-card">
                <header className="admin-users-header">
                    <div className="admin-users-search">
                        <i className="bi bi-search"></i>
                        <input
                            value={searchQuery}
                            onChange={(event) => setSearchQuery(event.target.value)}
                            placeholder="Поиск склада или адреса"
                        />
                    </div>
                    <div className="d-flex gap-2">
                        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={openAllMapView}>
                            <i className="bi bi-map me-1"></i>
                            Все на карте
                        </button>
                        <button type="button" className="btn btn-primary btn-sm" onClick={openCreate}>
                            <i className="bi bi-plus-circle me-1"></i>
                            Добавить склад
                        </button>
                    </div>
                </header>

                <div className="admin-users-table-wrap custom-scrollbar">
                    {loading && (
                        <div className="admin-loading text-center py-5">
                            <div className="spinner-border text-primary" role="status" />
                        </div>
                    )}

                    {!loading && (
                        <table className="table align-middle admin-users-table mb-0">
                            <thead>
                                <tr>
                                    <th>Название</th>
                                    <th>Радиус</th>
                                    <th>Адрес</th>
                                    <th className="text-end">Действия</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredStorages.map((storage) => (
                                    <tr key={storage.id}>
                                        <td>{storage.name}</td>
                                        <td>{storage.radius} км</td>
                                        <td>
                                            <button
                                                type="button"
                                                className="btn btn-link btn-sm p-0 admin-storage-address"
                                                onClick={() => copyAddress(storage.address)}
                                                title="Скопировать адрес"
                                            >
                                                {storage.address || "—"}
                                            </button>
                                        </td>
                                        <td>
                                            <div className="admin-users-actions">
                                                <button
                                                    type="button"
                                                    className="btn btn-sm btn-outline-secondary"
                                                    onClick={() => openMapView(storage)}
                                                    title="Показать на карте"
                                                >
                                                    <i className="bi bi-geo-alt-fill"></i>
                                                </button>
                                                <button
                                                    type="button"
                                                    className="btn btn-sm btn-outline-primary"
                                                    onClick={() => openEdit(storage)}
                                                    title="Редактировать"
                                                >
                                                    <i className="bi bi-pencil"></i>
                                                </button>
                                                <button
                                                    type="button"
                                                    className="btn btn-sm btn-outline-danger"
                                                    onClick={() => removeStorage(storage)}
                                                    title="Удалить"
                                                >
                                                    <i className="bi bi-trash"></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            <aside className={`admin-user-panel ${panelMode ? "open" : ""} ${(panelMode === "map" || panelMode === "all-map") ? "transport-mode" : ""}`} aria-hidden={!panelMode}>
                {!panelMode && <div className="admin-user-panel-empty">Выберите действие</div>}

                {(panelMode === "create" || panelMode === "edit") && (
                    <div className="admin-user-panel-inner">
                        <header className="admin-user-panel-header">
                            <h2>{panelMode === "edit" ? `Редактирование: ${activeStorage?.name || ""}` : "Добавить склад"}</h2>
                            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={closePanel}>
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </header>

                        <form className="admin-user-form" onSubmit={saveStorage}>
                            <label className="form-label mb-1">Название</label>
                            <input
                                className="form-control"
                                value={form.name}
                                onChange={(event) => handleField("name", event.target.value)}
                                required
                            />

                            <div className="admin-storage-coords-row">
                                <div>
                                    <label className="form-label mb-1 mt-2">Координата X (широта)</label>
                                    <input
                                        type="number"
                                        step="0.0000001"
                                        className="form-control"
                                        value={form.x_coord}
                                        onChange={(event) => handleField("x_coord", event.target.value)}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="form-label mb-1 mt-2">Координата Y (долгота)</label>
                                    <input
                                        type="number"
                                        step="0.0000001"
                                        className="form-control"
                                        value={form.y_coord}
                                        onChange={(event) => handleField("y_coord", event.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <label className="form-label mb-1 mt-2">Радиус (км)</label>
                            <input
                                type="number"
                                className="form-control"
                                value={form.radius}
                                onChange={(event) => handleField("radius", event.target.value)}
                                required
                            />

                            <div className="admin-storage-map-toolbar">
                                <button
                                    type="button"
                                    className="btn btn-sm btn-outline-secondary"
                                    onClick={() => setShowPickerMap((prev) => !prev)}
                                >
                                    <i className="bi bi-geo-alt me-1"></i>
                                    {showPickerMap ? "Скрыть карту" : "Выбрать на карте"}
                                </button>
                                <small className="text-body-secondary">Кликните по карте, чтобы заполнить координаты.</small>
                            </div>

                            {showPickerMap && (
                                <div className="admin-storage-map-wrap">
                                    <YandexMap
                                        center={pickerCenter}
                                        zoom={pickerZoom}
                                        markers={pickerMarkers}
                                        circles={pickerCircles}
                                        useObjectManager={false}
                                        onMapLoad={handlePickerMapLoad}
                                    />
                                </div>
                            )}

                            <div className="admin-user-panel-actions">
                                <button type="button" className="btn btn-outline-secondary" onClick={closePanel}>
                                    Отмена
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>
                                    {saving ? "Сохранение..." : "Сохранить"}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {panelMode === "map" && activeStorage && (
                    <div className="admin-user-panel-inner admin-transport-editor">
                        <header className="admin-user-panel-header">
                            <h2>Карта склада: {activeStorage.name}</h2>
                            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={closePanel}>
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </header>

                        <div className="admin-storage-map-wrap admin-storage-map-view">
                            <YandexMap
                                center={mapViewCenter}
                                zoom={13}
                                markers={mapViewMarkers}
                                circles={mapViewCircles}
                                useObjectManager={false}
                                onMapLoad={handleSingleMapLoad}
                            />
                        </div>

                        <div className="admin-storage-map-meta">
                            <div><strong>Координаты:</strong> {activeStorage.x}, {activeStorage.y}</div>
                            <div><strong>Радиус:</strong> {activeStorage.radius} км</div>
                            <div><strong>Адрес:</strong> {activeStorage.address || "—"}</div>
                        </div>

                        <div className="admin-user-panel-actions">
                            <button type="button" className="btn btn-outline-secondary" onClick={closePanel}>Закрыть</button>
                            <button type="button" className="btn btn-primary" onClick={() => openEdit(activeStorage)}>Редактировать</button>
                        </div>
                    </div>
                )}

                {panelMode === "all-map" && (
                    <div className="admin-user-panel-inner admin-transport-editor">
                        <header className="admin-user-panel-header">
                            <h2>Все склады на карте</h2>
                            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={closePanel}>
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </header>

                        <div className="admin-storage-map-wrap admin-storage-map-view">
                            <YandexMap
                                center={defaultCenter}
                                zoom={6}
                                markers={allMapMarkers}
                                circles={allMapCircles}
                                useObjectManager={false}
                                onMapLoad={handleAllMapLoad}
                            />
                        </div>

                        <div className="admin-storage-map-meta">
                            <div><strong>Складов:</strong> {storages.length}</div>
                        </div>

                        <div className="admin-user-panel-actions">
                            <button type="button" className="btn btn-outline-secondary" onClick={closePanel}>Закрыть</button>
                        </div>
                    </div>
                )}
            </aside>
        </section>
    );
}
