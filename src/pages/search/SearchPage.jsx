import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../../shared/api/client";
import "./SearchPage.css";

const PER_PAGE_OPTIONS = [25, 50, 100, 500, 1000, 10000];
const COLUMN_META = {
    uNumber: { label: "№ Лота", order: 0 },
    model_name: { label: "Модель", order: 1 },
    storage_name: { label: "Склад", order: 2 },
    region: { label: "Регион", order: 3 },
};

const defaultFilters = {
    nm: "",
    model: "",
    vin: "",
    customer: "",
    manager: "",
    storage: "",
    region: "",
    organization: "",
    model_type: "all",
    "1cparser": "yes",
    online: "all",
    last_time_start: "",
    last_time_end: "",
    per_page: "50",
};

const buildFiltersFromParams = (params) => ({
    nm: params.get("nm") || "",
    model: params.get("model") || "",
    vin: params.get("vin") || "",
    customer: params.get("customer") || "",
    manager: params.get("manager") || "",
    storage: params.get("storage") || "",
    region: params.get("region") || "",
    organization: params.get("organization") || "",
    model_type: params.get("model_type") || "all",
    "1cparser": params.get("1cparser") || "yes",
    online: params.get("online") || "all",
    last_time_start: params.get("last_time_start") || "",
    last_time_end: params.get("last_time_end") || "",
    per_page: params.get("per_page") || "50",
});

const stringifyValue = (value) => {
    if (value == null || value === "") return "—";
    if (typeof value === "boolean") return value ? "Да" : "Нет";
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
};

const buildCsv = (columns, rows) => {
    const escapeCell = (raw) => `"${String(raw ?? "").replace(/"/g, "\"\"")}"`;
    const header = columns.map(escapeCell).join(";");
    const body = rows.map((row) => columns.map((column) => escapeCell(stringifyValue(row[column]))).join(";"));
    return `\uFEFF${[header, ...body].join("\n")}`;
};

export function SearchPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [filters, setFilters] = useState(() => buildFiltersFromParams(searchParams));
    const [loading, setLoading] = useState(false);
    const [responseData, setResponseData] = useState({
        items: [],
        page: 1,
        per_page: 50,
        total_approx: 0,
        has_more: false,
    });

    const currentPage = Math.max(1, Number(searchParams.get("page")) || 1);

    useEffect(() => {
        setFilters(buildFiltersFromParams(searchParams));
    }, [searchParams]);

    useEffect(() => {
        let isMounted = true;

        const fetchData = async () => {
            setLoading(true);
            try {
                const params = {};
                searchParams.forEach((value, key) => {
                    if (value !== "") params[key] = value;
                });
                if (!params.page) params.page = 1;
                if (!params.per_page) params.per_page = 50;

                const { data } = await api.get("/search/transports", { params });
                if (!isMounted) return;

                setResponseData({
                    items: Array.isArray(data?.items) ? data.items : [],
                    page: Number(data?.page) || Number(params.page) || 1,
                    per_page: Number(data?.per_page) || Number(params.per_page) || 50,
                    total_approx: Number(data?.total_approx) || 0,
                    has_more: Boolean(data?.has_more),
                });
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchData();
        return () => {
            isMounted = false;
        };
    }, [searchParams]);

    const columns = useMemo(() => {
        const items = responseData.items;
        if (!items.length) return [];

        const keys = Object.keys(items[0] || {});
        const preferred = Object.keys(COLUMN_META).filter((key) => keys.includes(key));
        const rest = keys.filter((key) => !preferred.includes(key));
        rest.sort((a, b) => a.localeCompare(b, "ru"));
        return [...preferred, ...rest];
    }, [responseData.items]);

    const columnLabel = (key) => COLUMN_META[key]?.label || key;

    const handleField = (key, value) => {
        setFilters((prev) => ({ ...prev, [key]: value }));
    };

    const applyFilters = (event) => {
        event.preventDefault();
        const next = new URLSearchParams();

        Object.entries(filters).forEach(([key, value]) => {
            if (String(value ?? "").trim() !== "") next.set(key, String(value));
        });

        next.set("page", "1");
        setSearchParams(next);
    };

    const resetFilters = () => {
        setFilters(defaultFilters);
        setSearchParams(new URLSearchParams({ page: "1", per_page: "50" }));
    };

    const goToPage = (page) => {
        const nextPage = Math.max(1, page);
        const next = new URLSearchParams(searchParams);
        next.set("page", String(nextPage));
        if (!next.get("per_page")) next.set("per_page", String(filters.per_page || "50"));
        setSearchParams(next);
    };

    const onPerPageChange = (value) => {
        handleField("per_page", value);
        const next = new URLSearchParams(searchParams);
        next.set("per_page", String(value));
        next.set("page", "1");
        setSearchParams(next);
    };

    const downloadCsv = () => {
        if (!columns.length || !responseData.items.length) return;
        const content = buildCsv(columns, responseData.items);
        const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "transport_search.csv";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="search-page h-100 overflow-hidden">
            <div className="search-layout h-100">
                <aside className="search-filters custom-scrollbar">
                    <form onSubmit={applyFilters} className="search-filters-form">
                        <div className="search-filter-card">
                            <h2>Основные</h2>
                            <input className="form-control" placeholder="№ Лота (uNumber)" value={filters.nm} onChange={(e) => handleField("nm", e.target.value)} />
                            <input className="form-control" placeholder="Модель" value={filters.model} onChange={(e) => handleField("model", e.target.value)} />
                            <input className="form-control" placeholder="VIN" value={filters.vin} onChange={(e) => handleField("vin", e.target.value)} />
                            <select className="form-select" value={filters.model_type} onChange={(e) => handleField("model_type", e.target.value)}>
                                <option value="all">Тип: Все</option>
                                <option value="ПО">Тип: ПО</option>
                                <option value="ПТО">Тип: ПТО</option>
                            </select>
                        </div>

                        <div className="search-filter-card">
                            <h2>Локация</h2>
                            <input className="form-control" placeholder="Склад" value={filters.storage} onChange={(e) => handleField("storage", e.target.value)} />
                            <input className="form-control" placeholder="Регион" value={filters.region} onChange={(e) => handleField("region", e.target.value)} />
                            <input className="form-control" placeholder="Организация" value={filters.organization} onChange={(e) => handleField("organization", e.target.value)} />
                        </div>

                        <div className="search-filter-card">
                            <h2>Аренда</h2>
                            <input className="form-control" placeholder="Клиент" value={filters.customer} onChange={(e) => handleField("customer", e.target.value)} />
                            <input className="form-control" placeholder="Менеджер" value={filters.manager} onChange={(e) => handleField("manager", e.target.value)} />
                        </div>

                        <div className="search-filter-card">
                            <h2>Мониторинг</h2>
                            <select className="form-select" value={filters["1cparser"]} onChange={(e) => handleField("1cparser", e.target.value)}>
                                <option value="yes">1С parser: Да</option>
                                <option value="no">1С parser: Нет</option>
                                <option value="all">1С parser: Без фильтра</option>
                            </select>
                            <select className="form-select" value={filters.online} onChange={(e) => handleField("online", e.target.value)}>
                                <option value="all">Онлайн: Все</option>
                                <option value="yes">Онлайн: Да</option>
                                <option value="no">Онлайн: Нет</option>
                            </select>
                            <label className="form-label mb-0 mt-1">Последний онлайн (от)</label>
                            <input type="date" className="form-control" value={filters.last_time_start} onChange={(e) => handleField("last_time_start", e.target.value)} />
                            <label className="form-label mb-0 mt-1">Последний онлайн (до)</label>
                            <input type="date" className="form-control" value={filters.last_time_end} onChange={(e) => handleField("last_time_end", e.target.value)} />
                        </div>

                        <div className="search-filter-actions">
                            <button type="submit" className="btn btn-primary">
                                <i className="bi bi-search me-1"></i>
                                Применить
                            </button>
                            <button type="button" className="btn btn-outline-secondary" onClick={resetFilters}>
                                Сбросить
                            </button>
                        </div>
                    </form>
                </aside>

                <section className="search-results">
                    <header className="search-results-header">
                        <div className="search-results-meta">
                            <h1>Поиск транспорта</h1>
                        </div>
                        <div className="search-results-controls">
                            <select
                                className="form-select form-select-sm"
                                value={String(filters.per_page)}
                                onChange={(e) => onPerPageChange(e.target.value)}
                            >
                                {PER_PAGE_OPTIONS.map((value) => (
                                    <option key={value} value={value}>{value} / стр.</option>
                                ))}
                            </select>
                            <button
                                type="button"
                                className="btn btn-sm btn-outline-primary search-export-btn"
                                onClick={downloadCsv}
                                disabled={!responseData.items.length}
                                title="Скачать результаты"
                                aria-label="Скачать результаты"
                            >
                                <i className="bi bi-download"></i>
                            </button>
                        </div>
                    </header>

                    <div className="search-results-table-wrap custom-scrollbar">
                        {loading && (
                            <div className="search-state-card text-center">
                                <div className="spinner-border text-primary" role="status" />
                            </div>
                        )}

                        {!loading && !responseData.items.length && (
                            <div className="search-state-card text-center">
                                <i className="bi bi-inbox fs-1 text-body-secondary"></i>
                                <p className="mt-2 mb-0 text-body-secondary">Ничего не найдено.</p>
                            </div>
                        )}

                        {!loading && responseData.items.length > 0 && (
                            <div className="table-responsive">
                                <table className="table table-sm align-middle search-table mb-0">
                                    <thead>
                                        <tr>
                                            {columns.map((column) => (
                                                <th key={column}>{columnLabel(column)}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {responseData.items.map((item, index) => (
                                            <tr
                                                key={`${item.uNumber || "row"}-${index}`}
                                                className={item.uNumber ? "search-clickable-row" : ""}
                                                onClick={() => {
                                                    if (!item.uNumber) return;
                                                    window.open(`/car/${item.uNumber}`, "_blank", "noopener,noreferrer");
                                                }}
                                            >
                                                {columns.map((column) => {
                                                    const value = stringifyValue(item[column]);
                                                    return <td key={column} title={value}>{value}</td>;
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    <footer className="search-results-footer">
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => goToPage(currentPage - 1)}
                            disabled={currentPage <= 1 || loading}
                        >
                            Назад
                        </button>
                        <span className="search-page-indicator">Страница {currentPage}</span>
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => goToPage(currentPage + 1)}
                            disabled={!responseData.has_more || loading}
                        >
                            Вперед
                        </button>
                    </footer>
                </section>
            </div>
        </div>
    );
}
