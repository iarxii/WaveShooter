/* eslint-disable react-refresh/only-export-components */
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

// Special item types
export const SPECIAL_ITEM_TYPES = {
  VACUUM_PORTAL: 'vacuum_portal',
  BLEACH_BLOCKS: 'bleach_blocks',
  ANTIBIOTIC_BOMB: 'antibiotic_bomb',
  SUPPORT_VECTORS: 'support_vectors',
};

// Special item definitions
export const SPECIAL_ITEMS = {
  [SPECIAL_ITEM_TYPES.VACUUM_PORTAL]: {
    name: 'Vacuum Portal',
    description: 'Creates a void that attracts enemies towards it. Enemies that fall in are killed.',
    cooldown: 15000, // 15 seconds
    icon: '🌀',
  },
  [SPECIAL_ITEM_TYPES.BLEACH_BLOCKS]: {
    name: 'Bleach Blocks',
    description: 'Solidified bleach blocks that block enemy movement and cause damage on contact.',
    cooldown: 10000, // 10 seconds
    icon: '🧱',
  },
  [SPECIAL_ITEM_TYPES.ANTIBIOTIC_BOMB]: {
    name: 'Anti-biotic Bomb',
    description: 'Large AOE bomb that damages enemies on explosion and lingers for damage over time.',
    cooldown: 20000, // 20 seconds
    icon: '💣',
  },
  [SPECIAL_ITEM_TYPES.SUPPORT_VECTORS]: {
    name: 'Support Vectors',
    description: 'Calls in support vectors to aid the player. Recharges based on enemy kills.',
    cooldown: 0, // No cooldown, recharge-based
    icon: '🛡️',
    rechargeKills: 30, // 30 kills = 25% charge
  },
};

const SpecialItemsContext = createContext(null);

export function SpecialItemsProvider({ children }) {
  // Inventory: array of 4 slots, each can hold an item type or null
  const [inventory, setInventory] = useState(() => {
    try {
      const saved = localStorage.getItem("specialItemsInventory");
      return saved ? JSON.parse(saved) : [null, null, null, null];
    } catch {
      return [null, null, null, null];
    }
  });

  // Cooldowns: maps item type to end time (timestamp)
  const [cooldowns, setCooldowns] = useState(() => {
    try {
      const saved = localStorage.getItem("specialItemsCooldowns");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Support vectors charge: 0-100
  const [supportVectorsCharge, setSupportVectorsCharge] = useState(() => {
    try {
      const saved = localStorage.getItem("supportVectorsCharge");
      return saved ? parseFloat(saved) : 0;
    } catch {
      return 0;
    }
  });

  // Kill counter for support vectors recharge
  const [killCounter, setKillCounter] = useState(0);

  // Persist inventory
  useEffect(() => {
    try {
      localStorage.setItem("specialItemsInventory", JSON.stringify(inventory));
    } catch {
      /* ignore */
    }
  }, [inventory]);

  // Persist cooldowns
  useEffect(() => {
    try {
      localStorage.setItem("specialItemsCooldowns", JSON.stringify(cooldowns));
    } catch {
      /* ignore */
    }
  }, [cooldowns]);

  // Persist support vectors charge
  useEffect(() => {
    try {
      localStorage.setItem("supportVectorsCharge", String(supportVectorsCharge));
    } catch {
      /* ignore */
    }
  }, [supportVectorsCharge]);

  // Check if item is on cooldown
  const isOnCooldown = (itemType) => {
    const endTime = cooldowns[itemType];
    return endTime && Date.now() < endTime;
  };

  // Get remaining cooldown time in milliseconds
  const getCooldownRemaining = (itemType) => {
    const endTime = cooldowns[itemType];
    if (!endTime) return 0;
    return Math.max(0, endTime - Date.now());
  };

  // Start cooldown for an item
  const startCooldown = (itemType) => {
    const item = SPECIAL_ITEMS[itemType];
    if (!item || item.cooldown <= 0) return;

    setCooldowns(prev => ({
      ...prev,
      [itemType]: Date.now() + item.cooldown
    }));
  };

  // Equip item in slot
  const equipItem = (slotIndex, itemType) => {
    if (slotIndex < 0 || slotIndex >= 4) return;
    if (!SPECIAL_ITEMS[itemType]) return;

    setInventory(prev => {
      const newInventory = [...prev];
      newInventory[slotIndex] = itemType;
      return newInventory;
    });
  };

  // Unequip item from slot
  const unequipItem = (slotIndex) => {
    if (slotIndex < 0 || slotIndex >= 4) return;

    setInventory(prev => {
      const newInventory = [...prev];
      newInventory[slotIndex] = null;
      return newInventory;
    });
  };

  // Use item (check cooldown and trigger)
  const useItem = (itemType) => {
    if (isOnCooldown(itemType)) return false;

    // Special handling for support vectors
    if (itemType === SPECIAL_ITEM_TYPES.SUPPORT_VECTORS) {
      if (supportVectorsCharge < 100) return false;
      setSupportVectorsCharge(0);
      return true;
    }

    // Start cooldown for other items
    startCooldown(itemType);
    return true;
  };

  // Add kills for support vectors recharge
  const addKills = (killCount) => {
    setKillCounter(prev => {
      const newCount = prev + killCount;
      const chargeIncrease = Math.floor(newCount / SPECIAL_ITEMS[SPECIAL_ITEM_TYPES.SUPPORT_VECTORS].rechargeKills) * 25;
      if (chargeIncrease > 0) {
        setSupportVectorsCharge(prevCharge => Math.min(100, prevCharge + chargeIncrease));
        return newCount % SPECIAL_ITEMS[SPECIAL_ITEM_TYPES.SUPPORT_VECTORS].rechargeKills;
      }
      return newCount;
    });
  };

  // Get item in slot
  const getItemInSlot = (slotIndex) => {
    if (slotIndex < 0 || slotIndex >= 4) return null;
    return inventory[slotIndex];
  };

  // Check if slot has item
  const hasItemInSlot = (slotIndex) => {
    return getItemInSlot(slotIndex) !== null;
  };

  const value = useMemo(
    () => ({
      inventory,
      cooldowns,
      supportVectorsCharge,
      isOnCooldown,
      getCooldownRemaining,
      startCooldown,
      equipItem,
      unequipItem,
      useItem,
      addKills,
      getItemInSlot,
      hasItemInSlot,
      SPECIAL_ITEM_TYPES,
      SPECIAL_ITEMS,
    }),
    [
      inventory,
      cooldowns,
      supportVectorsCharge,
      isOnCooldown,
      getCooldownRemaining,
      startCooldown,
      equipItem,
      unequipItem,
      useItem,
      addKills,
      getItemInSlot,
      hasItemInSlot,
    ]
  );

  return <SpecialItemsContext.Provider value={value}>{children}</SpecialItemsContext.Provider>;
}

export function useSpecialItems() {
  const ctx = useContext(SpecialItemsContext);
  if (!ctx) throw new Error("useSpecialItems must be used within SpecialItemsProvider");
  return ctx;
}