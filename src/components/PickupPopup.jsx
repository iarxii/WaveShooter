import React, { useState, useEffect, useRef } from "react";


export default function PickupPopup({ pickup, onComplete }) {
  const [visible, setVisible] = useState(true);
  const hideTimerRef = useRef(null);
  const removeTimerRef = useRef(null);
  const onCompleteRef = useRef(onComplete);
  // Keep latest onComplete without retriggering the timer
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    hideTimerRef.current = setTimeout(() => {
      setVisible(false);
      removeTimerRef.current = setTimeout(() => {
        onCompleteRef.current && onCompleteRef.current();
      }, 500); // Allow fade out
    }, 3000);
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      if (removeTimerRef.current) clearTimeout(removeTimerRef.current);
    };
  }, []);

  const info =
    pickup.type === "health"
      ? { name: "Health Pack", effect: "+25 Health", color: "#22c55e" }
      : pickup.type === "armour"
        ? {
          name: "Armour Pack",
          effect: `+${pickup.amount ?? 25} AP`,
          color: "#60a5fa",
        }
        : pickup.type === "lasers"
          ? { name: "Laser Array", effect: "High Damage (5s)", color: "#ff4d4d" }
          : pickup.type === "shield"
            ? {
              name: "Shield Bubble",
              effect: "Keeps enemies away (5s)",
              color: "#66ccff",
            }
            : pickup.type === "pulsewave"
              ? {
                name: "Pulse Wave",
                effect: "3 bursts stun & launch enemies (5s)",
                color: "#f97316",
              }
              : pickup.type === "power"
                ? {
                  name: "Power Up",
                  effect: `+${pickup.amount ?? 50} Score`,
                  color: "#60a5fa",
                }
                : pickup.type === "invuln"
                  ? { name: "Invulnerability", effect: "Immune (5s)", color: "#facc15" }
                  : pickup.type === "bombs"
                    ? { name: "Bomb Kit", effect: "4/s bombs for 6s", color: "#111827" }
                    : pickup.type === "elemental"
                      ? { name: "Elemental Orbs", effect: "+3 FX Orbs", color: "#8b5cf6" }
                      : pickup.type === "speedboost"
                        ? { name: "Speed Boost", effect: "Speed +10% (4s)", color: "#22c55e" }
                        : pickup.type === "dmgscale"
                          ? {
                            name: "Enemy Fury",
                            effect: `Damage x${(pickup.scale ?? 1).toFixed(2)}`,
                            color: "#f97316",
                          }
                          : pickup.type === "speedramp"
                            ? {
                              name: "Speed Surge",
                              effect: `Enemies x${(pickup.scale ?? 1).toFixed(2)} • Player +1`,
                              color: "#22c55e",
                            }
                            : pickup.type === "level"
                              ? {
                                name: `Level ${pickup.level}`,
                                effect: "Stay sharp!",
                                color: "#60a5fa",
                              }
                              : pickup.type === "boss"
                                ? {
                                  name: "Boss Incoming",
                                  effect: `${pickup.name || "Boss"} • Level ${pickup.level ?? ""
                                    }`.trim(),
                                  color: pickup.color || "#ffb020",
                                }
                                : { name: "Debuff", effect: "Speed Reduced -10% (4s)", color: "#f97316" };

  return (
    <div
      className={`pickup-popup ${visible ? "visible" : "hidden"}`}
      style={{ "--popup-color": info.color }}
    >
      <div className="pickup-name">{info.name}</div>
      <div className="pickup-effect">{info.effect}</div>
    </div>
  );
}
