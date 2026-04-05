import { useState } from "react";
import { adminTabs } from "./constants";
import { AdminUsersTab } from "./tabs/AdminUsersTab";
import { AdminStoragesTab } from "./tabs/AdminStoragesTab";
import { AdminSettingsTab } from "./tabs/AdminSettingsTab";
import { AdminPresetsTab } from "./tabs/AdminPresetsTab";
import "./AdminPage.css";

export function AdminPage() {
    const [activeTab, setActiveTab] = useState("users");

    return (
        <div className="admin-page h-100 overflow-hidden bg-body">
            <div className="admin-layout h-100">
                <aside className="admin-side-panel bg-body-tertiary">
                    <div className="admin-side-title">Админка</div>
                    <div className="admin-tabs-list">
                        {adminTabs.map((tab) => (
                            <button
                                key={tab.id}
                                type="button"
                                className={`admin-tab-btn ${activeTab === tab.id ? "active" : ""}`}
                                onClick={() => setActiveTab(tab.id)}
                            >
                                <i className={`bi ${tab.icon}`}></i>
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </aside>

                <section className="admin-content bg-body">
                    {activeTab === "users" && <AdminUsersTab />}
                    {activeTab === "storages" && <AdminStoragesTab />}
                    {activeTab === "settings" && <AdminSettingsTab />}
                    {activeTab === "presets" && <AdminPresetsTab />}
                </section>
            </div>
        </div>
    );
}
