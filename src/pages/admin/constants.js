export const adminTabs = [
    { id: "users", label: "Пользователи", icon: "bi-people-fill" },
    { id: "storages", label: "Склады", icon: "bi-house-gear-fill" },
    { id: "settings", label: "Системные настройки", icon: "bi-sliders" },
    { id: "presets", label: "Пресеты", icon: "bi-bell-fill" },
];

export const settingsModules = [
    {
        id: "enable_voperator",
        healthKey: "voperator_module",
        title: "Виртуальный оператор",
        endpoint: "/settings/change_voperator_status",
        icon: "bi-robot",
    },
    {
        id: "enable_xml_parser",
        healthKey: "xml_parser_module",
        title: "1С парсер",
        endpoint: "/settings/change_xmlparser_status",
        icon: "bi-file-code-fill",
    },
    {
        id: "enable_db_cashing",
        healthKey: "cashing_module",
        title: "Кеш БД",
        endpoint: "/settings/change_dbcashing_status",
        icon: "bi-database-fill",
    },
];
