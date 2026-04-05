import { useMemo, useState } from "react";
import { getCarHistory } from "../api";
import { toUnix } from "../utils";

const getDefaultRange = () => {
    const now = new Date();
    const from = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    return {
        dateFrom: from.toISOString().slice(0, 16),
        dateTo: now.toISOString().slice(0, 16),
    };
};

export function useUnifiedCarMap() {
    const defaults = getDefaultRange();

    const [baseMarkers, setBaseMarkers] = useState([]);
    const [circles, setCircles] = useState([]);
    const [monitoring, setMonitoring] = useState([]);

    const [dateFrom, setDateFrom] = useState(defaults.dateFrom);
    const [dateTo, setDateTo] = useState(defaults.dateTo);
    const [monitoringSystem, setMonitoringSystem] = useState("");
    const [blockNumber, setBlockNumber] = useState("");
    const [validNavOnly, setValidNavOnly] = useState(true);
    const [history, setHistory] = useState([]);
    const [loadingTrack, setLoadingTrack] = useState(false);
    const [trackPanelOpen, setTrackPanelOpen] = useState(false);

    const syncFromCarInfo = (carInfo) => {
        const rent = carInfo?.rent || {};
        const monitoringList = Array.isArray(carInfo?.monitoring) ? carInfo.monitoring : [];

        const markers = [];
        if (rent.x != null && rent.y != null) {
            markers.push({
                id: "current",
                lat: Number(rent.x),
                lng: Number(rent.y),
                type: "red",
                title: "Текущее положение",
                description: rent.address || "",
            });
        }

        monitoringList.forEach((item, index) => {
            if (item?.pos_x == null || item?.pos_y == null) return;
            markers.push({
                id: `${item.type || "monitor"}-${item.uid || item.pin || index}`,
                lat: Number(item.pos_x),
                lng: Number(item.pos_y),
                type: item.type === "cesar" ? "orange" : "blue",
                title: item.type ? `Метка ${item.type}` : "Метка оборудования",
                description: item.uid || item.pin || "",
            });
        });

        setBaseMarkers(markers);
        setCircles([]); // TODO ignored storages API
        setMonitoring(monitoringList);
    };

    const availableBlocks = useMemo(() => {
        if (!monitoringSystem) {
            return Array.from(new Set(monitoring.map((m) => m.uid || m.pin).filter(Boolean))).sort();
        }

        const sysType = monitoringSystem.toLowerCase();
        return monitoring
            .filter((m) => String(m.type || "").toLowerCase() === sysType)
            .map((m) => m.uid || m.pin)
            .filter(Boolean)
            .filter((value, index, arr) => arr.indexOf(value) === index)
            .sort();
    }, [monitoring, monitoringSystem]);

    const filteredHistory = useMemo(() => {
        if (!validNavOnly) return history;
        return history.filter((point) => Number(point.valid_nav) === 1);
    }, [history, validNavOnly]);

    const routeCoordinates = useMemo(() => {
        return filteredHistory
            .filter((point) => point.pos_x != null && point.pos_y != null)
            .map((point) => [Number(point.pos_x), Number(point.pos_y)]);
    }, [filteredHistory]);

    const routeMarkers = useMemo(() => {
        if (!routeCoordinates.length) return [];
        const first = routeCoordinates[0];
        const last = routeCoordinates[routeCoordinates.length - 1];

        const markers = [
            { id: "route-start", lat: first[0], lng: first[1], type: "green", title: "Старт" },
        ];

        if (routeCoordinates.length > 1) {
            markers.push({ id: "route-end", lat: last[0], lng: last[1], type: "red", title: "Финиш" });
        }

        return markers;
    }, [routeCoordinates]);

    const markers = useMemo(() => [...baseMarkers, ...routeMarkers], [baseMarkers, routeMarkers]);

    const applyTrack = async (lotNumber) => {
        const timeFrom = toUnix(dateFrom);
        const timeTo = toUnix(dateTo);

        if (!timeFrom || !timeTo || timeFrom >= timeTo) {
            return false;
        }

        try {
            setLoadingTrack(true);
            const data = await getCarHistory({
                nm: lotNumber,
                timeFrom,
                timeTo,
                monitoringSystem,
                blockNumber,
            });
            setHistory(Array.isArray(data) ? data : []);
            return true;
        } finally {
            setLoadingTrack(false);
        }
    };

    const clearTrack = () => {
        setHistory([]);
        setMonitoringSystem("");
        setBlockNumber("");
        setValidNavOnly(true);
    };

    return {
        markers,
        circles,
        routes: routeCoordinates.length ? [routeCoordinates] : [],
        hasRoute: routeCoordinates.length > 0,
        filteredHistory,
        availableBlocks,
        monitoringSystem,
        blockNumber,
        dateFrom,
        dateTo,
        validNavOnly,
        loadingTrack,
        trackPanelOpen,
        setTrackPanelOpen,
        setDateFrom,
        setDateTo,
        setMonitoringSystem,
        setBlockNumber,
        setValidNavOnly,
        applyTrack,
        clearTrack,
        syncFromCarInfo,
    };
}
