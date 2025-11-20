import React from "react";

export default function CollapsiblePanel({ id, title, children, defaultOpen = true }) {
    const [open, setOpen] = React.useState(() => {
        try {
            const v = localStorage.getItem(`panel:${id}:open`);
            return v == null ? defaultOpen : v === "1";
        } catch {
            return defaultOpen;
        }
    });
    React.useEffect(() => {
        try {
            localStorage.setItem(`panel:${id}:open`, open ? "1" : "0");
        } catch { }
    }, [id, open]);
    return (
        <div className={`panel ${open ? "" : "collapsed"}`}>
            <div className="panel-header" onClick={() => setOpen((o) => !o)}>
                <div className="panel-title">{title}</div>
                <div className="chev">{open ? "▾" : "▸"}</div>
            </div>
            <div className="panel-content">{children}</div>
        </div>
    );
}
