import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../../features/auth/AuthContext";
import { useFlash } from "../../shared/flash/FlashProvider";
import { getCarInfo } from "./api";
import { normalizeLotNumber } from "./utils";
import { CarMapTab } from "./tabs/CarMapTab";
import { CarInfoTab } from "./tabs/CarInfoTab";
import { CarTransfersTab } from "./tabs/CarTransfersTab";
import { CarMonitoringTab } from "./tabs/CarMonitoringTab";
import { CarMovementTab } from "./tabs/CarMovementTab";
import { CarAlertsTab } from "./tabs/CarAlertsTab";
import { CarCommentsTab } from "./tabs/CarCommentsTab";
import { CarSensorsTab } from "./tabs/CarSensorsTab";
import { CarSettingsTab } from "./tabs/CarSettingsTab";
import { useUnifiedCarMap } from "./map/useUnifiedCarMap";
import { UnifiedCarMap } from "./map/UnifiedCarMap";
import { TrackPanel } from "./map/TrackPanel";
import "./CarPage.css";

const tabsWithMap = new Set(["info", "map", "movement"]);

export function CarPage() {
    const { carId } = useParams();
    const { hasRole } = useAuth();
    const flash = useFlash();
    const mapState = useUnifiedCarMap();

    const lotNumber = useMemo(() => normalizeLotNumber(carId), [carId]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [carInfo, setCarInfo] = useState({});

    const tabs = useMemo(() => {
        const list = [
            { id: "map", label: "Карта", icon: "bi-map" },
            { id: "info", label: "Карточка лота", icon: "bi-info-circle" },
        ];

        if (hasRole("car_transfers")) list.push({ id: "transfers", label: "Перемещения", icon: "bi-arrow-left-right" });
        if (hasRole("equipment")) list.push({ id: "monitoring", label: "Оборудование", icon: "bi-device-ssd" });
        if (hasRole("car_movement")) list.push({ id: "movement", label: "Трек", icon: "bi-geo-alt" });
        if (hasRole("car_sensors")) list.push({ id: "sensors", label: "Датчики", icon: "bi-code-square" });
        if (hasRole("car_alerts")) list.push({ id: "alerts", label: "Алерты", icon: "bi-bell" });
        if (hasRole("car_comments")) list.push({ id: "comments", label: "Комментарии", icon: "bi-chat-left-text" });
        if (hasRole("car_settings")) list.push({ id: "settings", label: "Настройки", icon: "bi-gear" });

        return list;
    }, [hasRole]);

    const [activeTab, setActiveTab] = useState("info");

    const refreshCarInfo = useCallback(async ({ initial = false } = {}) => {
        if (!lotNumber) return null;

        try {
            if (initial) {
                setLoading(true);
            } else {
                setRefreshing(true);
            }

            const data = await getCarInfo(lotNumber);
            const nextData = data || {};
            setCarInfo(nextData);
            mapState.syncFromCarInfo(nextData);
            return nextData;
        } catch {
            flash.error("Не удалось загрузить карточку ТС");
            return null;
        } finally {
            if (initial) {
                setLoading(false);
            } else {
                setRefreshing(false);
            }
        }
    }, [lotNumber, flash]);

    const syncComments = useCallback(async () => {
        const data = await refreshCarInfo();
        return Array.isArray(data?.comments) ? data.comments : [];
    }, [refreshCarInfo]);

    useEffect(() => {
        refreshCarInfo({ initial: true });
    }, [refreshCarInfo]);

    useEffect(() => {
        if (!tabs.some((tab) => tab.id === activeTab)) {
            setActiveTab(tabs[0]?.id || "info");
        }
    }, [tabs, activeTab]);

    useEffect(() => {
        if (activeTab === "info") {
            mapState.setTrackPanelOpen(true);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab]);

    const renderTab = () => {
        if (loading) {
            return (
                <div className="car-loading-state">
                    <div className="spinner-border text-primary" role="status" />
                </div>
            );
        }

        switch (activeTab) {
            case "map":
                return <CarMapTab mapState={mapState} />;
            case "info":
                return (
                    <CarInfoTab
                        carInfo={carInfo}
                        lotNumber={lotNumber}
                        comments={Array.isArray(carInfo?.comments) ? carInfo.comments : []}
                        onSyncComments={syncComments}
                    />
                );
            case "transfers":
                return <CarTransfersTab transfers={Array.isArray(carInfo?.transfers) ? carInfo.transfers : []} />;
            case "monitoring":
                return <CarMonitoringTab monitoring={Array.isArray(carInfo?.monitoring) ? carInfo.monitoring : []} />;
            case "movement":
                return <CarMovementTab lotNumber={lotNumber} mapState={mapState} />;
            case "alerts":
                return <CarAlertsTab alerts={Array.isArray(carInfo?.alert) ? carInfo.alert : []} onRefresh={refreshCarInfo} />;
            case "comments":
                return (
                    <CarCommentsTab
                        lotNumber={lotNumber}
                        comments={Array.isArray(carInfo?.comments) ? carInfo.comments : []}
                        onSyncComments={syncComments}
                    />
                );
            case "sensors":
                return <CarSensorsTab monitoring={Array.isArray(carInfo?.monitoring) ? carInfo.monitoring : []} />;
            case "settings":
                return <CarSettingsTab lotNumber={lotNumber} />;
            default:
                return null;
        }
    };

    const showMapDock = tabsWithMap.has(activeTab);
    const isInfoFocus = activeTab === "info";

    return (
        <div className="car-page h-100 overflow-hidden bg-body">
            <div className="car-layout h-100">
                <aside className="car-side-panel bg-body-tertiary">
                    <div className="car-side-head">
                        <div className="car-side-title">Карточка ТС</div>
                        <div className="car-side-subtitle">{lotNumber}</div>
                    </div>

                    <div className="car-tabs-list custom-scrollbar">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                type="button"
                                className={`car-tab-btn ${activeTab === tab.id ? "active" : ""}`}
                                onClick={() => setActiveTab(tab.id)}
                            >
                                <i className={`bi ${tab.icon}`}></i>
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </div>

                    <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => refreshCarInfo()} disabled={refreshing}>
                        <i className={`bi me-1 ${refreshing ? "bi-arrow-repeat" : "bi-arrow-clockwise"}`}></i>
                        {refreshing ? "Обновление..." : "Обновить"}
                    </button>
                </aside>

                <section className={`car-content bg-body custom-scrollbar car-workspace ${showMapDock ? "has-map" : "no-map"} ${isInfoFocus ? "focus-map" : ""}`}>
                    <div className="car-workspace-main">{renderTab()}</div>

                    <aside className={`car-map-dock ${showMapDock ? "" : "is-hidden"}`}>
                        <div className="car-map-dock-inner">
                            <UnifiedCarMap mapState={mapState} />

                            {activeTab === "info" && (
                                <button
                                    type="button"
                                    className="btn btn-sm btn-light border car-track-fab"
                                    onClick={() => mapState.setTrackPanelOpen(true)}
                                >
                                    <i className="bi bi-activity me-1"></i>
                                    Трек
                                </button>
                            )}

                        </div>
                    </aside>

                    {showMapDock && mapState.trackPanelOpen && (
                        <div className="car-track-global-overlay">
                            <TrackPanel
                                mapState={mapState}
                                lotNumber={lotNumber}
                                onClose={activeTab === "info" ? () => mapState.setTrackPanelOpen(false) : undefined}
                            />
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
