export const YANDEX_MAP_CONTROLS = ['zoomControl', 'typeSelector', 'rulerControl'];

export const YANDEX_MAP_OPTIONS = {
    suppressMapOpenBlock: true,
};

export const YANDEX_MAP_BOUNDS_OPTIONS = {
    checkZoomRange: true,
    zoomMargin: 50,
};

export const YANDEX_MAP_MAX_AUTO_ZOOM = 15;

export const YANDEX_OBJECT_MANAGER_OPTIONS = {
    clusterize: true,
    gridSize: 64,
    clusterDisableClickZoom: true,
    clusterOpenBalloonOnClick: true,
};

export const fitMapToGeoObjects = (map, maxZoom = YANDEX_MAP_MAX_AUTO_ZOOM) => {
    const bounds = map.geoObjects.getBounds();
    if (!bounds) return Promise.resolve();

    return map.setBounds(bounds, YANDEX_MAP_BOUNDS_OPTIONS).then(() => {
        if (map.getZoom() > maxZoom) {
            map.setZoom(maxZoom);
        }
    });
};
