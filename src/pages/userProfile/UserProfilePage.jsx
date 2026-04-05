import { useEffect, useMemo, useState } from "react";
import { api } from "../../shared/api/client";
import { useFlash } from "../../shared/flash/FlashProvider";
import "./UserProfilePage.css";

const normalizeObject = (payload) => {
    if (payload && typeof payload === "object" && !Array.isArray(payload)) {
        if (payload.data && typeof payload.data === "object" && !Array.isArray(payload.data)) {
            return payload.data;
        }
        return payload;
    }
    return {};
};

const extractApiKey = (payload) => {
    const data = normalizeObject(payload);
    const message = normalizeObject(data.message);

    return (
        data.api_key
        || data.apiKey
        || data.api_token
        || data.token
        || message.api_key
        || message.apiKey
        || message.api_token
        || message.token
        || null
    );
};

const formatDateTime = (raw) => {
    if (!raw) return "—";
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return String(raw);
    return date.toLocaleString("ru-RU");
};

const roleLabel = (role) => (Number(role) === 1 ? "Администратор" : "Пользователь");
const statusLabel = (status) => (Number(status) === 1 ? "Активен" : "Неактивен");

export function UserProfilePage() {
    const flash = useFlash();

    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState(null);
    const [apiKey, setApiKey] = useState(null);

    const [email, setEmail] = useState("");
    const [emailSaving, setEmailSaving] = useState(false);

    const [password, setPassword] = useState("");
    const [passwordConfirm, setPasswordConfirm] = useState("");
    const [passwordSaving, setPasswordSaving] = useState(false);

    const [apiKeyLoading, setApiKeyLoading] = useState(false);
    const [apiKeyGenerating, setApiKeyGenerating] = useState(false);
    const [showApiKey, setShowApiKey] = useState(false);

    const passwordError = useMemo(() => {
        if (!password && !passwordConfirm) return "";
        if (password.length < 6) return "Минимум 6 символов";
        if (password !== passwordConfirm) return "Пароли не совпадают";
        return "";
    }, [password, passwordConfirm]);

    const loadProfile = async () => {
        const { data } = await api.get("/users/me");
        const normalized = normalizeObject(data);
        setProfile(normalized);
        setEmail(normalized.email || "");
    };

    const loadApiKey = async () => {
        try {
            setApiKeyLoading(true);
            const { data } = await api.get("/key/get-api-key");
            setApiKey(extractApiKey(data));
        } catch {
            setApiKey(null);
        } finally {
            setApiKeyLoading(false);
        }
    };

    useEffect(() => {
        let mounted = true;
        const load = async () => {
            try {
                setLoading(true);
                await Promise.all([loadProfile(), loadApiKey()]);
            } catch {
                if (mounted) flash.error("Не удалось загрузить профиль");
            } finally {
                if (mounted) setLoading(false);
            }
        };
        load();
        return () => {
            mounted = false;
        };
    }, []);

    const submitEmail = async (event) => {
        event.preventDefault();
        try {
            setEmailSaving(true);
            await api.put("/users/me/email", { email: email.trim() });
            await loadProfile();
            flash.success("Email обновлен");
        } finally {
            setEmailSaving(false);
        }
    };

    const submitPassword = async (event) => {
        event.preventDefault();
        if (passwordError) return;

        try {
            setPasswordSaving(true);
            const formData = new FormData();
            formData.append("password", password);
            await api.put("/users/me/password", formData);
            setPassword("");
            setPasswordConfirm("");
            flash.success("Пароль обновлен");
        } finally {
            setPasswordSaving(false);
        }
    };

    const generateApiKey = async () => {
        try {
            setApiKeyGenerating(true);
            const { data } = await api.get("/key/generate-api-key");
            const nextKey = extractApiKey(data);
            setApiKey(nextKey);
            setShowApiKey(true);
            flash.success("API-ключ обновлен");
        } finally {
            setApiKeyGenerating(false);
        }
    };

    const copyApiKey = async () => {
        if (!apiKey) return;
        try {
            await navigator.clipboard.writeText(apiKey);
            flash.success("API-ключ скопирован");
        } catch {
            flash.error("Не удалось скопировать ключ");
        }
    };

    if (loading) {
        return (
            <section className="profile-page h-100 overflow-auto bg-body custom-scrollbar">
                <div className="profile-layout">
                    <div className="text-center py-5">
                        <div className="spinner-border text-primary" role="status" />
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section className="profile-page h-100 overflow-auto bg-body custom-scrollbar">
            <div className="profile-layout">
                <header className="profile-header-card">
                    <div className="profile-user-title-wrap">
                        <h1>Профиль пользователя</h1>
                        <div className="text-body-secondary">{profile?.username || "—"}</div>
                    </div>
                    <div className="profile-badges">
                        <span className="badge text-bg-primary">{roleLabel(profile?.role)}</span>
                        <span className={`badge ${Number(profile?.status) === 1 ? "text-bg-success" : "text-bg-secondary"}`}>
                            {statusLabel(profile?.status)}
                        </span>
                    </div>
                </header>

                <div className="profile-grid">
                    <article className="profile-card">
                        <div className="profile-card-head">
                            <h2>Основная информация</h2>
                        </div>
                        <div className="profile-card-body">
                            <div className="profile-kv-list">
                                <div className="profile-kv-item"><span>ID</span><strong>{profile?.id ?? "—"}</strong></div>
                                <div className="profile-kv-item"><span>Логин</span><strong>{profile?.username || "—"}</strong></div>
                                <div className="profile-kv-item"><span>Email</span><strong>{profile?.email || "—"}</strong></div>
                                <div className="profile-kv-item"><span>Последняя активность</span><strong>{formatDateTime(profile?.last_activity)}</strong></div>
                                <div className="profile-kv-item"><span>Первый вход</span><strong>{formatDateTime(profile?.first_login)}</strong></div>
                                <div className="profile-kv-item"><span>Активация пароля</span><strong>{formatDateTime(profile?.password_activated_date)}</strong></div>
                            </div>
                        </div>
                    </article>

                    <article className="profile-card">
                        <div className="profile-card-head">
                            <h2>API-ключ</h2>
                        </div>
                        <div className="profile-card-body">
                            {apiKeyLoading ? (
                                <div className="text-body-secondary">Загрузка ключа...</div>
                            ) : (
                                <>
                                    <div className="profile-api-key-value">
                                        {apiKey ? (showApiKey ? apiKey : "•".repeat(Math.min(Math.max(apiKey.length, 12), 40))) : "Ключ не создан"}
                                    </div>
                                    <div className="profile-actions-row">
                                        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setShowApiKey((prev) => !prev)} disabled={!apiKey}>
                                            {showApiKey ? "Скрыть" : "Показать"}
                                        </button>
                                        <button type="button" className="btn btn-outline-primary btn-sm" onClick={copyApiKey} disabled={!apiKey}>
                                            Копировать
                                        </button>
                                        <button type="button" className="btn btn-primary btn-sm" onClick={generateApiKey} disabled={apiKeyGenerating}>
                                            {apiKeyGenerating ? "Генерация..." : (apiKey ? "Перегенерировать" : "Сгенерировать")}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </article>

                    <article className="profile-card">
                        <div className="profile-card-head">
                            <h2>Изменить email</h2>
                        </div>
                        <div className="profile-card-body">
                            <form onSubmit={submitEmail}>
                                <label className="form-label">Новый email</label>
                                <input
                                    type="email"
                                    className="form-control"
                                    value={email}
                                    onChange={(event) => setEmail(event.target.value)}
                                    required
                                />
                                <div className="profile-actions-row mt-3">
                                    <button type="submit" className="btn btn-primary btn-sm" disabled={emailSaving}>
                                        {emailSaving ? "Сохранение..." : "Сохранить"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </article>

                    <article className="profile-card">
                        <div className="profile-card-head">
                            <h2>Изменить пароль</h2>
                        </div>
                        <div className="profile-card-body">
                            <form onSubmit={submitPassword}>
                                <label className="form-label">Новый пароль</label>
                                <input
                                    type="password"
                                    className={`form-control ${password && password.length < 6 ? "is-invalid" : ""}`}
                                    value={password}
                                    onChange={(event) => setPassword(event.target.value)}
                                    required
                                />
                                <label className="form-label mt-2">Подтверждение пароля</label>
                                <input
                                    type="password"
                                    className={`form-control ${passwordConfirm && password !== passwordConfirm ? "is-invalid" : ""}`}
                                    value={passwordConfirm}
                                    onChange={(event) => setPasswordConfirm(event.target.value)}
                                    required
                                />
                                {passwordError && <small className="text-danger d-block mt-2">{passwordError}</small>}
                                <div className="profile-actions-row mt-3">
                                    <button type="submit" className="btn btn-primary btn-sm" disabled={passwordSaving || Boolean(passwordError)}>
                                        {passwordSaving ? "Сохранение..." : "Сохранить"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </article>
                </div>
            </div>
        </section>
    );
}
