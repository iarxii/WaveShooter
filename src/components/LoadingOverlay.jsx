import React from "react";

export default function LoadingOverlay() {
    // simple local state for animated dots
    const [dots, setDots] = React.useState(0);
    React.useEffect(() => {
        const iid = setInterval(() => setDots((d) => (d + 1) % 4), 400);
        return () => clearInterval(iid);
    }, []);

    const overlayStyle = {
        position: "fixed",
        left: 0,
        top: 0,
        right: 0,
        bottom: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "auto",
        zIndex: 9999,
        background:
            "linear-gradient(180deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.85) 100%)",
        color: "#fff",
        flexDirection: "column",
    };
    const boxStyle = {
        padding: "18px 24px",
        borderRadius: 8,
        textAlign: "center",
        background: "rgba(0,0,0,0.35)",
        boxShadow: "0 6px 30px rgba(0,0,0,0.6)",
    };
    const spinnerStyle = {
        width: 56,
        height: 56,
        borderRadius: "50%",
        border: "4px solid rgba(255,255,255,0.08)",
        borderTopColor: "#ff4d4d",
        margin: "0 auto 10px",
    };
    const [angle, setAngle] = React.useState(0);
    // rotate spinner via JS to avoid injecting <style> tags inside Canvas tree
    React.useEffect(() => {
        const iid = setInterval(() => setAngle((a) => (a + 36) % 360), 80);
        return () => clearInterval(iid);
    }, []);
    const spinnerTransform = { transform: `rotate(${angle}deg)` };

    return (
        <div style={overlayStyle} aria-live="polite" role="status">
            <div style={boxStyle}>
                <div style={{ ...spinnerStyle, ...spinnerTransform }} />
                <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>
                    Loading assets
                </div>
                <div style={{ opacity: 0.9 }}>{"Please wait" + ".".repeat(dots)}</div>
            </div>
        </div>
    );
}
