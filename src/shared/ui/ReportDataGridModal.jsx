import { useMemo, useState } from "react";
import "./ReportDataGridModal.css";

const ROW_HEIGHT = 38;
const VIEWPORT_HEIGHT = 460;
const OVERSCAN = 8;

const normalizeCell = (value) => {
    if (value == null) return "";
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
};

const escapeCsv = (value) => `"${String(value).replace(/"/g, "\"\"")}"`;

export function ReportDataGridModal({ open, title, headers, rows, onClose }) {
    const [searchQuery, setSearchQuery] = useState("");
    const [columnFilters, setColumnFilters] = useState({});
    const [showColumnFilters, setShowColumnFilters] = useState(false);
    const [scrollTop, setScrollTop] = useState(0);

    const normalizedHeaders = useMemo(() => (Array.isArray(headers) ? headers : []), [headers]);

    const normalizedRows = useMemo(() => {
        const source = Array.isArray(rows) ? rows : [];
        return source.map((row) => {
            if (Array.isArray(row)) return row;
            if (row && typeof row === "object") {
                if (!normalizedHeaders.length) return Object.values(row);
                return normalizedHeaders.map((header) => row?.[header]);
            }
            return [row];
        });
    }, [rows, normalizedHeaders]);

    const filteredRows = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();

        return normalizedRows.filter((row) => {
            if (query) {
                const matchedGlobal = row.some((cell) => normalizeCell(cell).toLowerCase().includes(query));
                if (!matchedGlobal) return false;
            }

            for (const [indexKey, filterRaw] of Object.entries(columnFilters)) {
                const filterValue = String(filterRaw || "").trim().toLowerCase();
                if (!filterValue) continue;

                const index = Number(indexKey);
                const cell = normalizeCell(row[index]).toLowerCase();
                if (!cell.includes(filterValue)) return false;
            }

            return true;
        });
    }, [normalizedRows, searchQuery, columnFilters]);

    const visibleState = useMemo(() => {
        const total = filteredRows.length;
        const firstIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
        const visibleCount = Math.ceil(VIEWPORT_HEIGHT / ROW_HEIGHT) + OVERSCAN * 2;
        const endIndex = Math.min(total, firstIndex + visibleCount);

        return {
            firstIndex,
            endIndex,
            topPadding: firstIndex * ROW_HEIGHT,
            bottomPadding: Math.max(0, (total - endIndex) * ROW_HEIGHT),
            rows: filteredRows.slice(firstIndex, endIndex),
        };
    }, [filteredRows, scrollTop]);

    const downloadCsv = () => {
        const tableHeaders = normalizedHeaders.length
            ? normalizedHeaders
            : (filteredRows[0] || []).map((_, idx) => `Column ${idx + 1}`);

        const csv = [
            tableHeaders.map(escapeCsv).join(";"),
            ...filteredRows.map((row) => row.map((cell) => escapeCsv(normalizeCell(cell))).join(";")),
        ].join("\n");

        const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `report_${Date.now()}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    if (!open) return null;

    return (
        <>
            <div className="modal fade show d-block" tabIndex="-1" role="dialog" aria-modal="true">
                <div className="modal-dialog modal-xl modal-dialog-centered">
                    <div className="modal-content border-0 report-grid-modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title">{title}</h5>
                            <button type="button" className="btn-close" onClick={onClose} />
                        </div>
                        <div className="modal-body">
                            <div className="report-grid-toolbar">
                                <div className="report-grid-search">
                                    <i className="bi bi-search"></i>
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="Поиск по всем колонкам"
                                        value={searchQuery}
                                        onChange={(event) => setSearchQuery(event.target.value)}
                                    />
                                </div>

                                <div className="report-grid-actions">
                                    <button
                                        type="button"
                                        className="btn btn-sm btn-outline-secondary"
                                        onClick={() => setShowColumnFilters((prev) => !prev)}
                                    >
                                        <i className="bi bi-funnel me-1"></i>
                                        {showColumnFilters ? "Скрыть фильтры" : "Показать фильтры"}
                                    </button>
                                    <button type="button" className="btn btn-sm btn-outline-primary" onClick={downloadCsv}>
                                        <i className="bi bi-download me-1"></i>
                                        Скачать CSV
                                    </button>
                                </div>
                            </div>

                            <div className="report-grid-summary text-body-secondary">
                                Показано строк: {filteredRows.length} из {normalizedRows.length}
                            </div>

                            <div
                                className="report-grid-table-wrap custom-scrollbar"
                                style={{ height: `${VIEWPORT_HEIGHT}px` }}
                                onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
                            >
                                <table className="table table-sm table-striped align-middle report-grid-table mb-0">
                                    <thead>
                                        <tr>
                                            {normalizedHeaders.map((header, idx) => (
                                                <th key={`${header}-${idx}`}>{header}</th>
                                            ))}
                                        </tr>
                                        {showColumnFilters && (
                                            <tr>
                                                {normalizedHeaders.map((header, idx) => (
                                                    <th key={`${header}-${idx}-filter`}>
                                                        <input
                                                            className="form-control form-control-sm"
                                                            placeholder="Фильтр"
                                                            value={columnFilters[idx] || ""}
                                                            onChange={(event) => setColumnFilters((prev) => ({ ...prev, [idx]: event.target.value }))}
                                                        />
                                                    </th>
                                                ))}
                                            </tr>
                                        )}
                                    </thead>
                                    <tbody>
                                        {visibleState.topPadding > 0 && (
                                            <tr>
                                                <td colSpan={Math.max(1, normalizedHeaders.length)} style={{ height: `${visibleState.topPadding}px`, padding: 0, border: 0 }} />
                                            </tr>
                                        )}

                                        {visibleState.rows.map((row, localIndex) => (
                                            <tr key={visibleState.firstIndex + localIndex}>
                                                {(normalizedHeaders.length ? normalizedHeaders : row.map((_, idx) => idx)).map((_, cellIndex) => (
                                                    <td key={`${visibleState.firstIndex + localIndex}-${cellIndex}`}>
                                                        {normalizeCell(row[cellIndex])}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}

                                        {visibleState.bottomPadding > 0 && (
                                            <tr>
                                                <td colSpan={Math.max(1, normalizedHeaders.length)} style={{ height: `${visibleState.bottomPadding}px`, padding: 0, border: 0 }} />
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="modal-backdrop fade show" onClick={onClose}></div>
        </>
    );
}
