import { useEffect, useMemo, useState } from "react";
import { api } from "../../../shared/api/client";
import { useFlash } from "../../../shared/flash/FlashProvider";
import { unwrapData } from "../utils";

const parseMaybeJSON = (value, fallback) => {
    if (!value) return fallback;
    if (Array.isArray(value) || typeof value === "object") return value;
    if (typeof value !== "string") return fallback;
    try {
        return JSON.parse(value.replace(/'/g, '"'));
    } catch {
        return fallback;
    }
};

const normalizeRules = (rules) => {
    if (!Array.isArray(rules)) return [];
    return rules.map((rule, idx) => {
        const type = rule?.type || (rule?.param === "ALL" ? "ALL" : "OR");
        if (type === "ALL") return { id: `rule-${idx}`, type: "ALL", param: "ALL", value: "ALL" };
        return {
            id: `rule-${idx}`,
            type,
            param: rule?.param || "region",
            value: String(rule?.value || ""),
        };
    });
};

export function AdminUsersTab() {
    const flash = useFlash();

    const [loading, setLoading] = useState(false);
    const [users, setUsers] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");

    const [panelMode, setPanelMode] = useState(null);
    const [selectedUser, setSelectedUser] = useState(null);

    const [inviteForm, setInviteForm] = useState({ username: "", email: "", role: "0" });
    const [editForm, setEditForm] = useState({ username: "", email: "", role: "0", status: "1" });

    const [rolesLoading, setRolesLoading] = useState(false);
    const [rolesSaving, setRolesSaving] = useState(false);
    const [availableRoles, setAvailableRoles] = useState([]);
    const [selectedRoles, setSelectedRoles] = useState([]);

    const [transportLoading, setTransportLoading] = useState(false);
    const [transportSaving, setTransportSaving] = useState(false);
    const [transportParams, setTransportParams] = useState({ uNumber: [], manager: [], region: [] });
    const [transportRules, setTransportRules] = useState([]);

    const filteredUsers = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return users;

        return users.filter((user) => {
            const username = String(user.username || "").toLowerCase();
            const email = String(user.email || "").toLowerCase();
            return username.includes(query) || email.includes(query);
        });
    }, [searchQuery, users]);

    const groupedRoles = useMemo(() => {
        const grouped = availableRoles.reduce((acc, role) => {
            const category = role?.category_localization || "Без категории";
            if (!acc[category]) acc[category] = [];
            acc[category].push(role);
            return acc;
        }, {});
        return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b, "ru"));
    }, [availableRoles]);

    const loadUsers = async () => {
        setLoading(true);
        try {
            const { data } = await api.get("/admin/users/");
            setUsers(unwrapData(data));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadUsers();
    }, []);

    const closePanel = () => {
        setPanelMode(null);
        setSelectedUser(null);
    };

    const loadUserDetails = async (userId) => {
        const { data } = await api.get(`/admin/users/?id=${userId}`);
        return unwrapData(data)?.[0] || null;
    };

    const openPanel = async (mode, user = null) => {
        setPanelMode(mode);
        setSelectedUser(user);

        if (mode === "edit" && user) {
            setEditForm({
                username: user.username || "",
                email: user.email || "",
                role: String(user.role ?? 0),
                status: String(user.status ?? 1),
            });
        }

        if (mode === "roles" && user) {
            try {
                setRolesLoading(true);
                const [details, rolesRes] = await Promise.all([
                    loadUserDetails(user.id),
                    availableRoles.length ? Promise.resolve({ data: availableRoles }) : api.get("/admin/users/get_functionality_access_parameters"),
                ]);

                if (!availableRoles.length) setAvailableRoles(unwrapData(rolesRes.data));

                const parsed = parseMaybeJSON(details?.functionality_roles, []);
                const normalized = Array.isArray(parsed)
                    ? parsed.map((value) => Number(value)).filter((value) => !Number.isNaN(value))
                    : [];

                setSelectedRoles(normalized);
            } finally {
                setRolesLoading(false);
            }
        }

        if (mode === "transport" && user) {
            try {
                setTransportLoading(true);
                const [details, paramsRes] = await Promise.all([
                    loadUserDetails(user.id),
                    (transportParams.region.length || transportParams.manager.length || transportParams.uNumber.length)
                        ? Promise.resolve({ data: transportParams })
                        : api.get("/admin/users/get_transport_access_parameters"),
                ]);

                const payload = paramsRes.data || {};
                setTransportParams({
                    region: Array.isArray(payload.region) ? payload.region.map(String) : [],
                    manager: Array.isArray(payload.manager) ? payload.manager.map(String) : [],
                    uNumber: Array.isArray(payload.uNumber) ? payload.uNumber.map(String) : [],
                });

                setTransportRules(normalizeRules(parseMaybeJSON(details?.transport_access, [])));
            } finally {
                setTransportLoading(false);
            }
        }
    };

    const submitInvite = async (event) => {
        event.preventDefault();

        const body = new FormData();
        body.append("username", inviteForm.username.trim());
        body.append("email", inviteForm.email.trim());
        body.append("role", inviteForm.role);

        await api.post("/admin/users/add", body);
        flash.success("Пользователь приглашен");

        setInviteForm({ username: "", email: "", role: "0" });
        closePanel();
        await loadUsers();
    };

    const submitEdit = async (event) => {
        event.preventDefault();
        if (!selectedUser) return;

        const body = new FormData();
        body.append("username", editForm.username.trim());
        body.append("email", editForm.email.trim());
        body.append("role", editForm.role);
        body.append("status", editForm.status);

        await api.put(`/admin/users/edit/${selectedUser.id}`, body);
        flash.success("Профиль пользователя обновлен");

        closePanel();
        await loadUsers();
    };

    const resetPassword = async (user) => {
        if (!window.confirm(`Сбросить пароль пользователю "${user.username}"?`)) return;
        await api.put(`/admin/users/reset_pass/${user.id}`, {});
        flash.warning("Пароль пользователя сброшен", "Сброс пароля");
    };

    const toggleRole = (roleId, checked) => {
        const id = Number(roleId);
        setSelectedRoles((prev) => {
            if (checked && !prev.includes(id)) return [...prev, id];
            if (!checked) return prev.filter((item) => item !== id);
            return prev;
        });
    };

    const saveRoles = async () => {
        if (!selectedUser) return;
        try {
            setRolesSaving(true);
            await api.put(`/admin/users/set_functionality_roles/${selectedUser.id}`, {
                functionality_roles: selectedRoles.length ? selectedRoles : null,
            });
            flash.success("Роли функциональности обновлены");
            closePanel();
        } finally {
            setRolesSaving(false);
        }
    };

    const addRule = () => {
        setTransportRules((prev) => [...prev, {
            id: `rule-${Date.now()}-${prev.length}`,
            type: "OR",
            param: "region",
            value: "",
        }]);
    };

    const removeRule = (ruleId) => {
        setTransportRules((prev) => prev.filter((rule) => rule.id !== ruleId));
    };

    const updateRule = (ruleId, patch) => {
        setTransportRules((prev) => prev.map((rule) => {
            if (rule.id !== ruleId) return rule;
            const next = { ...rule, ...patch };

            if (patch.type === "ALL") {
                next.param = "ALL";
                next.value = "ALL";
            }

            if (patch.type && patch.type !== "ALL" && rule.type === "ALL") {
                next.param = "region";
                next.value = "";
            }

            if (patch.param && patch.param !== rule.param && patch.param !== "ALL") {
                next.value = "";
            }

            if (patch.param === "ALL") {
                next.type = "ALL";
                next.value = "ALL";
            }

            return next;
        }));
    };

    const valuesByParam = (param) => transportParams[param] || [];
    const valueInvalid = (rule) => rule.type !== "ALL" && rule.value && !valuesByParam(rule.param).includes(rule.value);

    const saveTransport = async () => {
        if (!selectedUser) return;

        const payload = transportRules
            .map((rule) => rule.type === "ALL"
                ? { type: "ALL", param: "ALL", value: "ALL" }
                : { type: rule.type, param: rule.param, value: String(rule.value || "").trim() }
            )
            .filter((rule) => rule.type === "ALL" || rule.value);

        try {
            setTransportSaving(true);
            await api.put(`/admin/users/set_transport_access/${selectedUser.id}`, { transport_access: payload });
            flash.success("Правила доступа к транспорту обновлены");
            closePanel();
        } finally {
            setTransportSaving(false);
        }
    };

    return (
        <section className={`admin-users-workspace ${panelMode ? "is-panel-open" : ""} ${panelMode === "transport" ? "is-transport-focus" : ""}`}>
            <div className="admin-users-card admin-card">
                <header className="admin-users-header">
                    <div className="admin-users-search">
                        <i className="bi bi-search"></i>
                        <input
                            value={searchQuery}
                            onChange={(event) => setSearchQuery(event.target.value)}
                            placeholder="Поиск по логину или email"
                        />
                    </div>
                    <button type="button" className="btn btn-sm admin-invite-btn" onClick={() => openPanel("invite")}>
                        <i className="bi bi-person-plus-fill me-1"></i>
                        Пригласить
                    </button>
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
                                    <th>Пользователь</th>
                                    <th>Email</th>
                                    <th>Последняя активность</th>
                                    <th className="text-end">Действия</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.map((user) => {
                                    const inactive = Number(user.status) === 0;
                                    return (
                                        <tr key={user.id} className={inactive ? "is-inactive" : ""}>
                                            <td>
                                                <div className="d-flex align-items-center gap-2">
                                                    {Number(user.role) === 1 && <i className="bi bi-star-fill text-warning"></i>}
                                                    <span>{user.username}</span>
                                                    {inactive && <span className="badge text-bg-secondary">Деактивирован</span>}
                                                </div>
                                            </td>
                                            <td>{user.email || "—"}</td>
                                            <td>{user.last_activity || "—"}</td>
                                            <td>
                                                <div className="admin-users-actions">
                                                    <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => openPanel("edit", user)}>
                                                        <i className="bi bi-pencil"></i>
                                                    </button>
                                                    <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => resetPassword(user)} disabled={inactive}>
                                                        <i className="bi bi-key"></i>
                                                    </button>
                                                    <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => openPanel("transport", user)} disabled={inactive}>
                                                        <i className="bi bi-bus-front"></i>
                                                    </button>
                                                    <button type="button" className="btn btn-sm btn-outline-info" onClick={() => openPanel("roles", user)} disabled={inactive}>
                                                        <i className="bi bi-gear"></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            <aside className={`admin-user-panel ${panelMode ? "open" : ""} ${panelMode === "transport" ? "transport-mode" : ""}`} aria-hidden={!panelMode}>
                {!panelMode && <div className="admin-user-panel-empty">Выберите действие</div>}

                {panelMode === "invite" && (
                    <div className="admin-user-panel-inner">
                        <header className="admin-user-panel-header">
                            <h2>Пригласить пользователя</h2>
                            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={closePanel}><i className="bi bi-x-lg"></i></button>
                        </header>
                        <form className="admin-user-form" onSubmit={submitInvite}>
                            <label className="form-label mb-1">Логин</label>
                            <input className="form-control" value={inviteForm.username} onChange={(e) => setInviteForm((p) => ({ ...p, username: e.target.value }))} required />
                            <label className="form-label mb-1 mt-2">Email</label>
                            <input type="email" className="form-control" value={inviteForm.email} onChange={(e) => setInviteForm((p) => ({ ...p, email: e.target.value }))} required />
                            <label className="form-label mb-1 mt-2">Роль</label>
                            <select className="form-select" value={inviteForm.role} onChange={(e) => setInviteForm((p) => ({ ...p, role: e.target.value }))}>
                                <option value="0">Пользователь</option>
                                <option value="1">Администратор</option>
                            </select>
                            <div className="admin-user-panel-actions">
                                <button type="button" className="btn btn-outline-secondary" onClick={closePanel}>Отмена</button>
                                <button type="submit" className="btn admin-submit-btn">Пригласить</button>
                            </div>
                        </form>
                    </div>
                )}

                {panelMode === "edit" && selectedUser && (
                    <div className="admin-user-panel-inner">
                        <header className="admin-user-panel-header">
                            <h2>Редактирование: {selectedUser.username}</h2>
                            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={closePanel}><i className="bi bi-x-lg"></i></button>
                        </header>
                        <form className="admin-user-form" onSubmit={submitEdit}>
                            <label className="form-label mb-1">Логин</label>
                            <input className="form-control" value={editForm.username} onChange={(e) => setEditForm((p) => ({ ...p, username: e.target.value }))} required />
                            <label className="form-label mb-1 mt-2">Email</label>
                            <input type="email" className="form-control" value={editForm.email} onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))} required />
                            <label className="form-label mb-1 mt-2">Роль</label>
                            <select className="form-select" value={editForm.role} onChange={(e) => setEditForm((p) => ({ ...p, role: e.target.value }))}>
                                <option value="0">Пользователь</option>
                                <option value="1">Администратор</option>
                            </select>
                            <label className="form-label mb-1 mt-2">Статус</label>
                            <select className="form-select" value={editForm.status} onChange={(e) => setEditForm((p) => ({ ...p, status: e.target.value }))}>
                                <option value="1">Активен</option>
                                <option value="0">Деактивирован</option>
                            </select>
                            <div className="admin-user-panel-actions">
                                <button type="button" className="btn btn-outline-secondary" onClick={closePanel}>Отмена</button>
                                <button type="submit" className="btn admin-submit-btn">Сохранить</button>
                            </div>
                        </form>
                    </div>
                )}

                {panelMode === "roles" && selectedUser && (
                    <div className="admin-user-panel-inner">
                        <header className="admin-user-panel-header">
                            <h2>Функциональные роли: {selectedUser.username}</h2>
                            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={closePanel}><i className="bi bi-x-lg"></i></button>
                        </header>

                        {rolesLoading && <div className="text-center py-4"><div className="spinner-border text-primary" role="status" /></div>}

                        {!rolesLoading && (
                            <div className="admin-role-groups custom-scrollbar">
                                {groupedRoles.map(([category, roles]) => (
                                    <div key={category} className="admin-role-group">
                                        <h6>{category}</h6>
                                        <div className="admin-role-items">
                                            {roles.map((role) => {
                                                const id = Number(role.id);
                                                return (
                                                    <label key={id} className="admin-role-item">
                                                        <input
                                                            type="checkbox"
                                                            className="form-check-input"
                                                            checked={selectedRoles.includes(id)}
                                                            onChange={(e) => toggleRole(id, e.target.checked)}
                                                        />
                                                        <span>{role.localization || role.name || `Role #${id}`}</span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="admin-user-panel-actions">
                            <button type="button" className="btn btn-outline-secondary" onClick={closePanel}>Отмена</button>
                            <button type="button" className="btn admin-submit-btn" disabled={rolesSaving || rolesLoading} onClick={saveRoles}>
                                {rolesSaving ? "Сохранение..." : "Сохранить"}
                            </button>
                        </div>
                    </div>
                )}

                {panelMode === "transport" && selectedUser && (
                    <div className="admin-user-panel-inner admin-transport-editor">
                        <header className="admin-user-panel-header">
                            <h2>Доступ к транспорту: {selectedUser.username}</h2>
                            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={closePanel}><i className="bi bi-x-lg"></i></button>
                        </header>

                        {transportLoading && <div className="text-center py-4"><div className="spinner-border text-primary" role="status" /></div>}

                        {!transportLoading && (
                            <>
                                <div className="admin-transport-rules custom-scrollbar">
                                    {transportRules.map((rule, idx) => (
                                        <div key={rule.id || idx} className="admin-transport-rule">
                                            <div className="admin-transport-rule-grid">
                                                <div>
                                                    <label className="form-label mb-1">Тип</label>
                                                    <select className="form-select form-select-sm" value={rule.type} onChange={(e) => updateRule(rule.id, { type: e.target.value })}>
                                                        <option value="OR">ИЛИ</option>
                                                        <option value="AND">И</option>
                                                        <option value="AND NOT">И НЕ</option>
                                                        <option value="ALL">ВСЕ</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="form-label mb-1">Параметр</label>
                                                    <select className="form-select form-select-sm" value={rule.type === "ALL" ? "ALL" : rule.param} onChange={(e) => updateRule(rule.id, { param: e.target.value })} disabled={rule.type === "ALL"}>
                                                        <option value="region">Регион</option>
                                                        <option value="manager">Менеджер</option>
                                                        <option value="uNumber">Номер ТС</option>
                                                        <option value="ALL">ВСЕ</option>
                                                    </select>
                                                </div>
                                                <div className="admin-transport-remove">
                                                    <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => removeRule(rule.id)}>
                                                        <i className="bi bi-trash"></i>
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="admin-transport-value-row">
                                                <label className="form-label mb-1">Значение</label>
                                                <input
                                                    className="form-control form-control-sm"
                                                    list={`transport-values-${idx}`}
                                                    value={rule.type === "ALL" ? "ALL" : rule.value}
                                                    onChange={(e) => updateRule(rule.id, { value: e.target.value })}
                                                    disabled={rule.type === "ALL"}
                                                    title={rule.value || ""}
                                                />
                                                {rule.type !== "ALL" && (
                                                    <datalist id={`transport-values-${idx}`}>
                                                        {valuesByParam(rule.param).map((value) => <option value={value} key={`${idx}-${value}`} />)}
                                                    </datalist>
                                                )}
                                                {valueInvalid(rule) && (
                                                    <small className="text-danger d-block mt-1">
                                                        <i className="bi bi-exclamation-circle me-1"></i>
                                                        Значение недоступно
                                                    </small>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <button type="button" className="btn btn-sm admin-add-rule-btn" onClick={addRule}>
                                    <i className="bi bi-plus-circle me-1"></i>
                                    Добавить правило
                                </button>
                            </>
                        )}

                        <div className="admin-user-panel-actions">
                            <button type="button" className="btn btn-outline-secondary" onClick={closePanel}>Отмена</button>
                            <button type="button" className="btn admin-submit-btn" disabled={transportSaving || transportLoading} onClick={saveTransport}>
                                {transportSaving ? "Сохранение..." : "Сохранить"}
                            </button>
                        </div>
                    </div>
                )}
            </aside>
        </section>
    );
}
