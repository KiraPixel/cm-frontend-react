import { CarCommentsTab } from "./CarCommentsTab";
import { formatNullable } from "../utils";

function KV({ label, value }) {
    return (
        <div className="car-kv-item">
            <span className="car-kv-label">{label}</span>
            <span className="car-kv-value">{formatNullable(value)}</span>
        </div>
    );
}

function Group({ title, children }) {
    return (
        <section className="car-lot-group">
            <h4>{title}</h4>
            <div className="car-kv-list">{children}</div>
        </section>
    );
}

function CarInfoDetails({ carInfo }) {
    const storage = carInfo?.storage || {};
    const transport = carInfo?.transport || {};
    const model = carInfo?.transport_model || {};
    const rent = carInfo?.rent || {};

    return (
        <section className="car-panel-card">
            <header><h3>Информация о лоте</h3></header>
            <div className="car-panel-body car-lot-info-scroll custom-scrollbar">
                <Group title="Склад">
                    <KV label="Название" value={storage.name} />
                    <KV label="Тип" value={storage.type} />
                    <KV label="Регион" value={storage.region} />
                    <KV label="Адрес" value={storage.address} />
                </Group>

                <Group title="Техника">
                    <KV label="VIN" value={transport.vin} />
                    <KV label="Год выпуска" value={transport.manufacture_year} />
                    <KV label="Тип" value={model.type} />
                    <KV label="Тип техники" value={model.machine_type} />
                    <KV label="Бренд" value={model.brand} />
                    <KV label="Модель" value={model.model} />
                    <KV label="Подъемник" value={model.lift_type} />
                    <KV label="Двигатель" value={model.engine} />
                    <KV label="Название в 1С" value={model.name} />
                </Group>

                <Group title="Аренда">
                    <KV label="Статус в 1С" value={Number(rent.in_parser_1c) === 1 ? "Присутствует" : "Отсутствует"} />
                    <KV label="Клиент" value={rent.customer} />
                    <KV label="Контакт клиента" value={rent.customer_contact} />
                    <KV label="Менеджер" value={rent.manager} />
                    <KV label="Координаты" value={rent.x && rent.y ? `${rent.x}, ${rent.y}` : null} />
                    <KV label="Риск глушения" value={transport.jamming_risk} />
                    <KV label="Адрес" value={rent.address} />
                </Group>
            </div>
        </section>
    );
}

export function CarInfoTab({ carInfo, lotNumber, comments = [], onSyncComments }) {
    return (
        <div className="car-lot-overview">
            <section className="car-lot-info">
                <CarInfoDetails carInfo={carInfo} />
            </section>

            <section className="car-panel-card car-lot-comments">
                <header><h3>Комментарии</h3></header>
                <div className="car-panel-body">
                    <CarCommentsTab
                        lotNumber={lotNumber}
                        comments={comments}
                        onSyncComments={onSyncComments}
                        embedded
                    />
                </div>
            </section>
        </div>
    );
}
