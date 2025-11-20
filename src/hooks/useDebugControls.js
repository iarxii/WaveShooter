import { useState, useEffect } from "react";

export function useDebugControls() {
    // Border effects debug controls
    const [debugBorderEffectsEnabled, setDebugBorderEffectsEnabled] = useState(
        () => {
            const v = localStorage.getItem("dbgBorderEffectsEnabled");
            return v === "1" || v === "true";
        }
    );
    const [debugLowHealthBorder, setDebugLowHealthBorder] = useState(() => {
        const v = localStorage.getItem("dbgLowHealthBorder");
        return v === "1" || v === "true";
    });
    const [debugPickupGlowBorder, setDebugPickupGlowBorder] = useState(() => {
        const v = localStorage.getItem("dbgPickupGlowBorder");
        return v === "1" || v === "true";
    });
    const [debugLaserChargingBorder, setDebugLaserChargingBorder] = useState(
        () => {
            const v = localStorage.getItem("dbgLaserChargingBorder");
            return v === "1" || v === "true";
        }
    );
    const [debugLaserFiringBorder, setDebugLaserFiringBorder] = useState(
        () => {
            const v = localStorage.getItem("dbgLaserFiringBorder");
            return v === "1" || v === "true";
        }
    );
    const [debugLaserCooldownBorder, setDebugLaserCooldownBorder] = useState(
        () => {
            const v = localStorage.getItem("dbgLaserCooldownBorder");
            return v === "1" || v === "true";
        }
    );
    const [debugLaserReadyBorder, setDebugLaserReadyBorder] = useState(
        () => {
            const v = localStorage.getItem("dbgLaserReadyBorder");
            return v === "1" || v === "true";
        }
    );
    const [debugBombChargingBorder, setDebugBombChargingBorder] = useState(
        () => {
            const v = localStorage.getItem("dbgBombChargingBorder");
            return v === "1" || v === "true";
        }
    );
    const [debugBombCooldownBorder, setDebugBombCooldownBorder] = useState(
        () => {
            const v = localStorage.getItem("dbgBombCooldownBorder");
            return v === "1" || v === "true";
        }
    );
    const [debugBombReadyBorder, setDebugBombReadyBorder] = useState(
        () => {
            const v = localStorage.getItem("dbgBombReadyBorder");
            return v === "1" || v === "true";
        }
    );
    const [debugDashChargingBorder, setDebugDashChargingBorder] = useState(
        () => {
            const v = localStorage.getItem("dbgDashChargingBorder");
            return v === "1" || v === "true";
        }
    );
    const [debugDashCooldownBorder, setDebugDashCooldownBorder] = useState(
        () => {
            const v = localStorage.getItem("dbgDashCooldownBorder");
            return v === "1" || v === "true";
        }
    );
    const [debugDashReadyBorder, setDebugDashReadyBorder] = useState(
        () => {
            const v = localStorage.getItem("dbgDashReadyBorder");
            return v === "1" || v === "true";
        }
    );
    const [debugHeavyChargingBorder, setDebugHeavyChargingBorder] = useState(
        () => {
            const v = localStorage.getItem("dbgHeavyChargingBorder");
            return v === "1" || v === "true";
        }
    );
    const [debugHeavyCooldownBorder, setDebugHeavyCooldownBorder] = useState(
        () => {
            const v = localStorage.getItem("dbgHeavyCooldownBorder");
            return v === "1" || v === "true";
        }
    );
    const [debugHeavyReadyBorder, setDebugHeavyReadyBorder] = useState(
        () => {
            const v = localStorage.getItem("dbgHeavyReadyBorder");
            return v === "1" || v === "true";
        }
    );
    const [debugSpecialChargingBorder, setDebugSpecialChargingBorder] = useState(
        () => {
            const v = localStorage.getItem("dbgSpecialChargingBorder");
            return v === "1" || v === "true";
        }
    );
    const [debugSpecialCooldownBorder, setDebugSpecialCooldownBorder] = useState(
        () => {
            const v = localStorage.getItem("dbgSpecialCooldownBorder");
            return v === "1" || v === "true";
        }
    );
    const [debugSpecialReadyBorder, setDebugSpecialReadyBorder] = useState(
        () => {
            const v = localStorage.getItem("dbgSpecialReadyBorder");
            return v === "1" || v === "true";
        }
    );

    useEffect(() => {
        localStorage.setItem(
            "dbgBorderEffectsEnabled",
            debugBorderEffectsEnabled ? "1" : "0"
        );
    }, [debugBorderEffectsEnabled]);
    useEffect(() => {
        localStorage.setItem(
            "dbgLowHealthBorder",
            debugLowHealthBorder ? "1" : "0"
        );
    }, [debugLowHealthBorder]);
    useEffect(() => {
        localStorage.setItem(
            "dbgPickupGlowBorder",
            debugPickupGlowBorder ? "1" : "0"
        );
    }, [debugPickupGlowBorder]);
    useEffect(() => {
        localStorage.setItem(
            "dbgLaserChargingBorder",
            debugLaserChargingBorder ? "1" : "0"
        );
    }, [debugLaserChargingBorder]);
    useEffect(() => {
        localStorage.setItem(
            "dbgLaserFiringBorder",
            debugLaserFiringBorder ? "1" : "0"
        );
    }, [debugLaserFiringBorder]);
    useEffect(() => {
        localStorage.setItem(
            "dbgLaserCooldownBorder",
            debugLaserCooldownBorder ? "1" : "0"
        );
    }, [debugLaserCooldownBorder]);
    useEffect(() => {
        localStorage.setItem(
            "dbgLaserReadyBorder",
            debugLaserReadyBorder ? "1" : "0"
        );
    }, [debugLaserReadyBorder]);
    useEffect(() => {
        localStorage.setItem(
            "dbgBombChargingBorder",
            debugBombChargingBorder ? "1" : "0"
        );
    }, [debugBombChargingBorder]);
    useEffect(() => {
        localStorage.setItem(
            "dbgBombCooldownBorder",
            debugBombCooldownBorder ? "1" : "0"
        );
    }, [debugBombCooldownBorder]);
    useEffect(() => {
        localStorage.setItem(
            "dbgBombReadyBorder",
            debugBombReadyBorder ? "1" : "0"
        );
    }, [debugBombReadyBorder]);
    useEffect(() => {
        localStorage.setItem(
            "dbgDashChargingBorder",
            debugDashChargingBorder ? "1" : "0"
        );
    }, [debugDashChargingBorder]);
    useEffect(() => {
        localStorage.setItem(
            "dbgDashCooldownBorder",
            debugDashCooldownBorder ? "1" : "0"
        );
    }, [debugDashCooldownBorder]);
    useEffect(() => {
        localStorage.setItem(
            "dbgDashReadyBorder",
            debugDashReadyBorder ? "1" : "0"
        );
    }, [debugDashReadyBorder]);
    useEffect(() => {
        localStorage.setItem(
            "dbgHeavyChargingBorder",
            debugHeavyChargingBorder ? "1" : "0"
        );
    }, [debugHeavyChargingBorder]);
    useEffect(() => {
        localStorage.setItem(
            "dbgHeavyCooldownBorder",
            debugHeavyCooldownBorder ? "1" : "0"
        );
    }, [debugHeavyCooldownBorder]);
    useEffect(() => {
        localStorage.setItem(
            "dbgHeavyReadyBorder",
            debugHeavyReadyBorder ? "1" : "0"
        );
    }, [debugHeavyReadyBorder]);
    useEffect(() => {
        localStorage.setItem(
            "dbgSpecialChargingBorder",
            debugSpecialChargingBorder ? "1" : "0"
        );
    }, [debugSpecialChargingBorder]);
    useEffect(() => {
        localStorage.setItem(
            "dbgSpecialCooldownBorder",
            debugSpecialCooldownBorder ? "1" : "0"
        );
    }, [debugSpecialCooldownBorder]);
    useEffect(() => {
        localStorage.setItem(
            "dbgSpecialReadyBorder",
            debugSpecialReadyBorder ? "1" : "0"
        );
    }, [debugSpecialReadyBorder]);

    return {
        debugBorderEffectsEnabled, setDebugBorderEffectsEnabled,
        debugLowHealthBorder, setDebugLowHealthBorder,
        debugPickupGlowBorder, setDebugPickupGlowBorder,
        debugLaserChargingBorder, setDebugLaserChargingBorder,
        debugLaserFiringBorder, setDebugLaserFiringBorder,
        debugLaserCooldownBorder, setDebugLaserCooldownBorder,
        debugLaserReadyBorder, setDebugLaserReadyBorder,
        debugBombChargingBorder, setDebugBombChargingBorder,
        debugBombCooldownBorder, setDebugBombCooldownBorder,
        debugBombReadyBorder, setDebugBombReadyBorder,
        debugDashChargingBorder, setDebugDashChargingBorder,
        debugDashCooldownBorder, setDebugDashCooldownBorder,
        debugDashReadyBorder, setDebugDashReadyBorder,
        debugHeavyChargingBorder, setDebugHeavyChargingBorder,
        debugHeavyCooldownBorder, setDebugHeavyCooldownBorder,
        debugHeavyReadyBorder, setDebugHeavyReadyBorder,
        debugSpecialChargingBorder, setDebugSpecialChargingBorder,
        debugSpecialCooldownBorder, setDebugSpecialCooldownBorder,
        debugSpecialReadyBorder, setDebugSpecialReadyBorder,
    };
}
