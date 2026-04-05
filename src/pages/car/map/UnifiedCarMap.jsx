import { YandexMap } from "../../../shared/ui/YandexMap";

export function UnifiedCarMap({ mapState }) {
    const { markers, circles, routes } = mapState;

    const center = markers[0] ? [markers[0].lat, markers[0].lng] : [55.75, 37.57];
    const zoom = markers[0] ? 12 : 8;

    return (
        <div className="car-map-wrap car-map-persistent">
            <YandexMap
                center={center}
                zoom={zoom}
                markers={markers}
                circles={circles}
                routes={routes}
                useObjectManager={false}
            />
        </div>
    );
}
