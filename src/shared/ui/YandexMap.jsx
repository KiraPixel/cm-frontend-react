import { useEffect, useRef, useState } from 'react';
import {
    fitMapToGeoObjects,
    YANDEX_MAP_CONTROLS,
    YANDEX_MAP_OPTIONS,
    YANDEX_OBJECT_MANAGER_OPTIONS,
} from './yandexMapConfig';

/**
 * Компонент-обертка для Яндекс.Карт.
 */
export function YandexMap({
    center = [55.75, 37.57],
    zoom = 10,
    markers = [],
    circles = [],
    routes = [],
    useObjectManager = true,
    onMapLoad,
}) {
    const mapContainerRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const objectManagerRef = useRef(null);
    const markerGeoObjectsRef = useRef([]);
    const polylinesRef = useRef([]);
    const circlesRef = useRef([]);
    const markerClickHandlersRef = useRef(new Map());
    const [mapReadyToken, setMapReadyToken] = useState(0);

    const createFeatures = () => {
        markerClickHandlersRef.current.clear();

        const markerFeatures = markers.map((marker, index) => {
            const featureId = `marker-${marker.id ?? index}`;
            if (typeof marker.onClick === 'function') {
                markerClickHandlersRef.current.set(featureId, marker.onClick);
            }

            return {
                type: 'Feature',
                id: featureId,
                geometry: { type: 'Point', coordinates: [marker.lat, marker.lng] },
                properties: {
                    balloonContentHeader: marker.balloonHeader || marker.clusterCaption || marker.title || '',
                    balloonContent: marker.description || '',
                    clusterCaption: marker.clusterCaption || marker.title || '',
                    hintContent: marker.title || '',
                },
                options: { preset: `islands#${marker.type || 'blue'}DotIcon` },
            };
        });

        return markerFeatures;
    };

    useEffect(() => {
        if (!window.ymaps || !mapContainerRef.current) return;

        let map;

        window.ymaps.ready(() => {
            if (mapInstanceRef.current) return;

            map = new window.ymaps.Map(mapContainerRef.current, {
                center,
                zoom,
                controls: YANDEX_MAP_CONTROLS,
            }, YANDEX_MAP_OPTIONS);

            if (useObjectManager) {
                const objectManager = new window.ymaps.ObjectManager(YANDEX_OBJECT_MANAGER_OPTIONS);
                objectManagerRef.current = objectManager;
                map.geoObjects.add(objectManager);

                objectManager.objects.events.add('click', (e) => {
                    const objectId = e.get('objectId');
                    const markerClickHandler = markerClickHandlersRef.current.get(objectId);
                    if (markerClickHandler) markerClickHandler();
                });
            }

            mapInstanceRef.current = map;
            setMapReadyToken(token => token + 1);

            // When map mounts inside animated/hidden containers, it may need an explicit viewport recalculation.
            setTimeout(() => {
                if (!mapInstanceRef.current) return;
                map.container.fitToViewport();
                fitMapToGeoObjects(map).catch(() => {});
            }, 180);

            if (onMapLoad) {
                onMapLoad({
                    getMap: () => map,
                    setCenter: (coords, newZoom) => map.setCenter(coords, newZoom),
                    setBounds: () => {
                        fitMapToGeoObjects(map);
                    },
                    clear: () => {
                        if (objectManagerRef.current) {
                            objectManagerRef.current.removeAll();
                        }
                        markerGeoObjectsRef.current.forEach(markerObject => map.geoObjects.remove(markerObject));
                        markerGeoObjectsRef.current = [];
                        circlesRef.current.forEach(circleObject => map.geoObjects.remove(circleObject));
                        circlesRef.current = [];
                        polylinesRef.current.forEach(polyline => map.geoObjects.remove(polyline));
                        polylinesRef.current = [];
                    },
                });
            }
        });

        return () => {
            mapInstanceRef.current?.destroy();
            mapInstanceRef.current = null;
        };
    }, []);

    useEffect(() => {
        if (!mapInstanceRef.current) return;
        const map = mapInstanceRef.current;

        if (useObjectManager) {
            if (!objectManagerRef.current) return;
            const objectManager = objectManagerRef.current;
            objectManager.removeAll();
            const features = createFeatures();
            objectManager.add({ type: 'FeatureCollection', features });
            return;
        }

        markerGeoObjectsRef.current.forEach(markerObject => map.geoObjects.remove(markerObject));
        markerGeoObjectsRef.current = [];

        markers.forEach((marker, index) => {
            const markerId = `marker-${marker.id ?? index}`;
            const placemark = new window.ymaps.Placemark(
                [marker.lat, marker.lng],
                {
                    balloonContentHeader: marker.balloonHeader || marker.clusterCaption || marker.title || '',
                    balloonContent: marker.description || '',
                    hintContent: marker.title || '',
                },
                { preset: `islands#${marker.type || 'blue'}DotIcon` }
            );
            const clickHandler = marker.onClick || markerClickHandlersRef.current.get(markerId);
            if (typeof clickHandler === 'function') {
                placemark.events.add('click', clickHandler);
            }
            map.geoObjects.add(placemark);
            markerGeoObjectsRef.current.push(placemark);
        });
    }, [markers, useObjectManager, mapReadyToken]);

    useEffect(() => {
        if (!mapInstanceRef.current) return;
        const map = mapInstanceRef.current;

        circlesRef.current.forEach(circleObject => map.geoObjects.remove(circleObject));
        circlesRef.current = [];

        circles.forEach((circle) => {
            const circleObject = new window.ymaps.Circle(
                [[circle.lat, circle.lng], circle.radius],
                { balloonContent: `<b>${circle.title || ''}</b><br>${circle.description || ''}`, hintContent: circle.title || '' },
                { fillColor: circle.fillColor || '#007bff55', strokeColor: circle.color || '#007bff', strokeWidth: 2 },
            );
            map.geoObjects.add(circleObject);
            circlesRef.current.push(circleObject);
        });
    }, [circles, mapReadyToken]);

    useEffect(() => {
        if (!mapInstanceRef.current) return;
        const map = mapInstanceRef.current;
        polylinesRef.current.forEach(polyline => map.geoObjects.remove(polyline));
        polylinesRef.current = [];

        routes.forEach((route, index) => {
            const polyline = new window.ymaps.Polyline(route, { hintContent: `Маршрут ${index + 1}` }, { strokeColor: '#0000ff', strokeWidth: 4, strokeOpacity: 0.8 });
            map.geoObjects.add(polyline);
            polylinesRef.current.push(polyline);
        });

        if ((markers.length > 0 || circles.length > 0 || routes.length > 0) && map.geoObjects.getLength() > 0) {
            setTimeout(() => {
                map.container.fitToViewport();
                fitMapToGeoObjects(map);
            }, 100);
        }
    }, [routes, markers.length, circles.length, mapReadyToken]);

    return <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />;
}
