import { useEffect, useMemo, useState } from "react";
import { api } from "../../shared/api/client";
import { useFlash } from "../../shared/flash/FlashProvider";
import { ReportDataGridModal } from "../../shared/ui/ReportDataGridModal";
import "./ReportsPage.css";

const reportStatusMap = {
    done: { label: "Готовый", className: "success" },
    requested: { label: "Запрошен", className: "warning" },
    error: { label: "Ошибка", className: "danger" },
};

const buildInitialFormValues = (configuration) => {
    if (!configuration) return {};

    return Object.entries(configuration).reduce((acc, [key, config]) => {
        acc[key] = config.type === "checkbox" ? false : "";
        return acc;
    }, {});
};

const normalizeRequestedReports = (payload) => {
    const rawList = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.reports)
            ? payload.reports
            : [];

    return rawList.map((report) => ({
        id: report.id ?? `${report.type || "report"}-${report.end_date || report.updated_date || Math.random()}`,
        name: report.type || report.name || "report",
        start_date: report.start_date,
        end_date: report.end_date,
        updated_date: report.updated_date,
        status: report.status,
        percentage_completed: report.percentage_completed ?? report.percentage_complated,
        success: report.success,
        errors: report.errors,
    }));
};

const resolveReportStatus = (report) => {
    const rawStatus = String(report?.status || "").toLowerCase();

    if (rawStatus in reportStatusMap) {
        return reportStatusMap[rawStatus];
    }

    if (report?.success === false) {
        return reportStatusMap.error;
    }

    const percent = Number(report?.percentage_completed);
    if (!Number.isNaN(percent) && percent >= 100) {
        return reportStatusMap.done;
    }

    return reportStatusMap.requested;
};

const formatUnixDate = (value) => {
    const raw = Number(value);
    if (Number.isNaN(raw) || raw <= 0) return "—";
    return new Date(raw * 1000).toLocaleString("ru-RU");
};

const extractPreviewPayload = (payload) => {
    const root = payload?.data || payload?.message || payload || {};
    const reportRoot = root?.json_result ? root : (root?.json_result ? root : root);
    const jsonResult = reportRoot?.json_result || root?.json_result || root || {};

    const headers = Array.isArray(jsonResult.headers)
        ? jsonResult.headers
        : Array.isArray(root.headers)
            ? root.headers
            : [];

    const rows = Array.isArray(jsonResult.field)
        ? jsonResult.field
        : Array.isArray(jsonResult.rows)
            ? jsonResult.rows
            : Array.isArray(root.field)
                ? root.field
                : Array.isArray(root.rows)
                    ? root.rows
                    : [];

    return {
        name: reportRoot?.name || root?.name || "report",
        headers,
        rows,
    };
};

export function ReportsPage() {
    const flash = useFlash();
    const [loading, setLoading] = useState(true);
    const [loadFailed, setLoadFailed] = useState(false);
    const [categories, setCategories] = useState([]);
    const [reportList, setReportList] = useState([]);
    const [requestedReports, setRequestedReports] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedReport, setSelectedReport] = useState(null);
    const [formValues, setFormValues] = useState({});
    const [submittingMode, setSubmittingMode] = useState(null);
    const [historyRefreshing, setHistoryRefreshing] = useState(false);

    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewTitle, setPreviewTitle] = useState("");
    const [previewHeaders, setPreviewHeaders] = useState([]);
    const [previewRows, setPreviewRows] = useState([]);

    const fetchRequestedHistory = async () => {
        const { data } = await api.get("/users/me/reports");
        const fetchedHistory = normalizeRequestedReports(data || {});
        fetchedHistory.sort((a, b) => Number(b.end_date || b.updated_date || 0) - Number(a.end_date || a.updated_date || 0));
        setRequestedReports(fetchedHistory);
    };

    useEffect(() => {
        let isMounted = true;

        const fetchReports = async () => {
            setLoading(true);
            setLoadFailed(false);

            try {
                const [catsRes, typesRes, requestedRes] = await Promise.all([
                    api.get("/report_generator/report-categories"),
                    api.get("/report_generator/report-list"),
                    api.get("/users/me/reports"),
                ]);

                if (!isMounted) return;

                const fetchedCategories = Array.isArray(catsRes.data) ? catsRes.data : [];
                const fetchedReports = Array.isArray(typesRes.data) ? typesRes.data : [];
                const fetchedHistory = normalizeRequestedReports(requestedRes.data || {});

                fetchedCategories.sort((a, b) => (a.position || 0) - (b.position || 0));
                fetchedHistory.sort((a, b) => Number(b.end_date || b.updated_date || 0) - Number(a.end_date || a.updated_date || 0));

                setCategories(fetchedCategories);
                setReportList(fetchedReports);
                setRequestedReports(fetchedHistory);
            } catch {
                if (!isMounted) return;
                setLoadFailed(true);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchReports();

        return () => {
            isMounted = false;
        };
    }, []);

    const groupedCategories = useMemo(() => {
        const normalizedQuery = searchQuery.trim().toLowerCase();

        return categories
            .map((category) => {
                const reports = reportList.filter((report) => {
                    if (report.category !== category.id) return false;
                    if (!normalizedQuery) return true;

                    const name = String(report.localization_name || "").toLowerCase();
                    const code = String(report.report_name || "").toLowerCase();
                    return name.includes(normalizedQuery) || code.includes(normalizedQuery);
                });

                return { ...category, reports };
            })
            .filter((category) => category.reports.length > 0);
    }, [categories, reportList, searchQuery]);

    const reportLocalizationByCode = useMemo(() => {
        const map = new Map();
        reportList.forEach((item) => {
            const code = String(item?.report_name || "").trim();
            const localized = String(item?.localization_name || "").trim();
            if (code && localized) map.set(code, localized);
        });
        return map;
    }, [reportList]);

    const openReport = (report) => {
        setSelectedReport(report);
        setFormValues(buildInitialFormValues(report.configuration));
    };

    const closeModal = () => {
        if (submittingMode) return;
        setSelectedReport(null);
        setFormValues({});
    };

    const handleFieldChange = (key, value) => {
        setFormValues((prev) => ({ ...prev, [key]: value }));
    };

    const validateFormValues = (configuration, values) => {
        if (!configuration) return true;
        for (const [key, config] of Object.entries(configuration)) {
            if (config.type === "checkbox") continue;
            const value = values[key];
            if (value == null || String(value).trim() === "") {
                flash.warning(`Заполните поле: ${config.label || key}`);
                return false;
            }
        }
        return true;
    };

    const submitReport = async (mode) => {
        if (!selectedReport) return;
        if (!validateFormValues(selectedReport.configuration, formValues)) return;

        const payload = {
            report_name: selectedReport.report_name,
            send_to_mail: mode === "mail",
            ...formValues,
        };

        try {
            setSubmittingMode(mode);
            const { data } = await api.post("/report_generator/generate-report", payload);

            if (mode === "mail") {
                flash.warning(data?.message || "Отчёт поставлен в очередь. Результат придёт на почту.", "Отчёт сформирован");
                closeModal();
                return;
            }

            const preview = extractPreviewPayload(data || {});
            if (!Array.isArray(preview.headers) || !Array.isArray(preview.rows) || !preview.headers.length) {
                flash.error("Сервер вернул отчёт без табличных данных");
                return;
            }

            setPreviewTitle(reportLocalizationByCode.get(preview.name) || reportLocalizationByCode.get(selectedReport.report_name) || selectedReport.localization_name || selectedReport.report_name);
            setPreviewHeaders(preview.headers);
            setPreviewRows(preview.rows);
            setPreviewOpen(true);
            closeModal();
        } finally {
            setSubmittingMode(null);
        }
    };

    const getReportDisplayName = (name) => reportLocalizationByCode.get(name) || name;

    const refreshHistory = async () => {
        try {
            setHistoryRefreshing(true);
            await fetchRequestedHistory();
            flash.info("История отчётов обновлена");
        } finally {
            setHistoryRefreshing(false);
        }
    };

    return (
        <div className="reports-page h-100 overflow-hidden">
            <div className="reports-layout h-100">
                <aside className="reports-side-column">
                    <div className="reports-side-panel">
                        <label htmlFor="report-search" className="form-label mb-2">Поиск отчёта</label>
                        <div className="reports-search-control">
                            <i className="bi bi-search reports-search-icon"></i>
                            <input
                                id="report-search"
                                type="text"
                                className="reports-search-input"
                                placeholder="Название или код"
                                value={searchQuery}
                                onChange={(event) => setSearchQuery(event.target.value)}
                            />
                        </div>
                    </div>

                    <div className="reports-side-panel reports-side-panel-secondary">
                        <div className="reports-panel-heading">
                            <span>История отчётов</span>
                            <button
                                type="button"
                                className="btn btn-sm btn-outline-secondary"
                                onClick={refreshHistory}
                                disabled={historyRefreshing || loading}
                                title="Обновить статусы"
                            >
                                <i className={`bi ${historyRefreshing ? "bi-arrow-repeat reports-spin" : "bi-arrow-clockwise"}`}></i>
                            </button>
                        </div>
                        <div className="reports-panel-block reports-requested-list">
                            {requestedReports.length === 0 && (
                                <div className="reports-requested-empty">История отчётов пока пуста</div>
                            )}
                            {requestedReports.map((report) => {
                                const status = resolveReportStatus(report);
                                const progressValue = Math.max(0, Math.min(Number(report.percentage_completed) || 0, 100));
                                return (
                                    <article key={report.id} className="reports-requested-item">
                                        <header className="reports-requested-header">
                                            <strong>{getReportDisplayName(report.name)}</strong>
                                        </header>

                                        <div className="reports-history-status-bar" role="status" aria-label={`Статус: ${status.label}`}>
                                            <div
                                                className={`reports-history-status-fill reports-history-status-fill-${status.className}`}
                                                style={{ width: `${progressValue}%` }}
                                            />
                                            <div className="reports-history-status-text">
                                                <span>{status.label}</span>
                                                <span>{progressValue}%</span>
                                            </div>
                                        </div>

                                        <div className="reports-requested-meta">
                                            <span>Дата окончания: {formatUnixDate(report.end_date)}</span>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    </div>
                </aside>

                <section className="reports-content custom-scrollbar">
                    {loading && (
                        <div className="reports-state-card text-center">
                            <div className="spinner-border text-primary" role="status" />
                            <p className="mb-0 mt-3 text-body-secondary">Загрузка отчётов...</p>
                        </div>
                    )}

                    {!loading && loadFailed && (
                        <div className="reports-state-card text-center">
                            <i className="bi bi-wifi-off fs-1 text-body-secondary"></i>
                            <p className="mb-0 mt-3 text-body-secondary">Не удалось загрузить данные отчётов.</p>
                        </div>
                    )}

                    {!loading && !loadFailed && groupedCategories.length === 0 && (
                        <div className="reports-state-card text-center">
                            <i className="bi bi-inbox fs-1 text-body-secondary"></i>
                            <p className="mb-0 mt-3 text-body-secondary">Ничего не найдено по текущему запросу.</p>
                        </div>
                    )}

                    {!loading && !loadFailed && groupedCategories.length > 0 && (
                        <div className="reports-grid">
                            {groupedCategories.map((category) => (
                                <section key={category.id} className="reports-category-card">
                                    <header className="reports-category-header">
                                        <h2>{category.localization_name}</h2>
                                        <span className="badge rounded-pill text-bg-light">{category.reports.length}</span>
                                    </header>
                                    <ul className="list-unstyled reports-list mb-0">
                                        {category.reports.map((report) => (
                                            <li key={report.report_name} className="reports-list-item">
                                                <div className="reports-list-meta">
                                                    <span className="reports-list-title">{report.localization_name}</span>
                                                    <span className="reports-list-code">{report.report_name}</span>
                                                </div>
                                                <div className="reports-list-actions">
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm btn-outline-primary reports-open-btn"
                                                        onClick={() => openReport(report)}
                                                        title="Открыть параметры отчёта"
                                                    >
                                                        <i className="bi bi-sliders"></i>
                                                    </button>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </section>
                            ))}
                        </div>
                    )}
                </section>
            </div>

            {selectedReport && (
                <>
                    <div className="modal fade show d-block" tabIndex="-1" role="dialog" aria-modal="true">
                        <div className="modal-dialog modal-dialog-centered">
                            <div className="modal-content border-0 reports-modal-content">
                                <div className="modal-header">
                                    <h5 className="modal-title">{selectedReport.localization_name}</h5>
                                    <button type="button" className="btn-close" onClick={closeModal} disabled={Boolean(submittingMode)} />
                                </div>
                                <div className="modal-body">
                                    <div className="d-flex flex-column gap-3">
                                        {selectedReport.configuration && Object.entries(selectedReport.configuration).map(([key, config]) => {
                                            const inputId = `field_${key}`;

                                            if (config.type === "checkbox") {
                                                return (
                                                    <div className="form-check form-switch" key={key}>
                                                        <input
                                                            id={inputId}
                                                            className="form-check-input"
                                                            type="checkbox"
                                                            checked={Boolean(formValues[key])}
                                                            onChange={(event) => handleFieldChange(key, event.target.checked)}
                                                        />
                                                        <label className="form-check-label" htmlFor={inputId}>{config.label}</label>
                                                    </div>
                                                );
                                            }

                                            if (config.type === "date") {
                                                return (
                                                    <div key={key}>
                                                        <label htmlFor={inputId} className="form-label mb-1">{config.label}</label>
                                                        <input
                                                            id={inputId}
                                                            type="date"
                                                            className="form-control"
                                                            value={formValues[key] || ""}
                                                            onChange={(event) => handleFieldChange(key, event.target.value)}
                                                            required
                                                        />
                                                    </div>
                                                );
                                            }

                                            return (
                                                <div key={key}>
                                                    <label htmlFor={inputId} className="form-label mb-1">{config.label}</label>
                                                    <input
                                                        id={inputId}
                                                        type="text"
                                                        className="form-control"
                                                        value={formValues[key] || ""}
                                                        placeholder={config.placeholder || ""}
                                                        onChange={(event) => handleFieldChange(key, event.target.value)}
                                                        required
                                                    />
                                                </div>
                                            );
                                        })}

                                        {!selectedReport.configuration && (
                                            <p className="text-body-secondary mb-0">
                                                Для этого отчёта параметры не требуются.
                                            </p>
                                        )}
                                    </div>

                                    <div className="mt-4 d-flex justify-content-end gap-2">
                                        <button type="button" className="btn btn-secondary" onClick={closeModal} disabled={Boolean(submittingMode)}>Отмена</button>
                                        {!selectedReport.heavy_report && (
                                            <button
                                                type="button"
                                                className="btn btn-outline-primary"
                                                onClick={() => submitReport("preview")}
                                                disabled={Boolean(submittingMode)}
                                            >
                                                {submittingMode === "preview" ? "Загрузка..." : "Открыть онлайн"}
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            className="btn btn-primary"
                                            onClick={() => submitReport("mail")}
                                            disabled={Boolean(submittingMode)}
                                        >
                                            {submittingMode === "mail" ? "Отправка..." : "Сформировать на почту"}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="modal-backdrop fade show" onClick={closeModal}></div>
                </>
            )}

            <ReportDataGridModal
                open={previewOpen}
                title={previewTitle ? `${previewTitle}: онлайн просмотр` : "Онлайн просмотр отчёта"}
                headers={previewHeaders}
                rows={previewRows}
                onClose={() => setPreviewOpen(false)}
            />
        </div>
    );
}
