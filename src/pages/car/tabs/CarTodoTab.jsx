export function CarTodoTab({ title, description }) {
    return (
        <section className="car-panel-card">
            <header><h3>{title}</h3></header>
            <div className="car-panel-body">
                <div className="car-todo-note">
                    <i className="bi bi-cone-striped me-2"></i>
                    {description || "Раздел в работе"}
                </div>
            </div>
        </section>
    );
}
