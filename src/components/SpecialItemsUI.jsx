import React from 'react';
import { useSpecialItems, SPECIAL_ITEMS } from '../contexts/SpecialItemsContext.jsx';

export function SpecialItemsInventory({ onSelectItem, selectedSlot }) {
  const {
    inventory,
    isOnCooldown,
    getCooldownRemaining,
    supportVectorsCharge,
    SPECIAL_ITEM_TYPES
  } = useSpecialItems();

  const formatCooldown = (ms) => {
    const seconds = Math.ceil(ms / 1000);
    return `${seconds}s`;
  };

  const getItemDisplay = (itemType, slotIndex) => {
    if (!itemType) {
      return {
        icon: '⬜',
        name: 'Empty',
        description: 'No item equipped',
        available: false,
        cooldownText: '',
      };
    }

    const item = SPECIAL_ITEMS[itemType];
    const onCooldown = isOnCooldown(itemType);
    const cooldownMs = getCooldownRemaining(itemType);

    let available = !onCooldown;
    let cooldownText = '';

    if (itemType === SPECIAL_ITEM_TYPES.SUPPORT_VECTORS) {
      available = supportVectorsCharge >= 100;
      cooldownText = `${Math.round(supportVectorsCharge)}%`;
    } else if (onCooldown) {
      available = false;
      cooldownText = formatCooldown(cooldownMs);
    }

    return {
      icon: item.icon,
      name: item.name,
      description: item.description,
      available,
      cooldownText,
    };
  };

  const slotKeys = ['U', 'I', 'O', 'P'];

  return (
    <div style={{
      position: 'fixed',
      bottom: 20,
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      gap: 10,
      background: 'rgba(0, 0, 0, 0.8)',
      padding: 10,
      borderRadius: 8,
      zIndex: 1000,
    }}>
      {inventory.map((itemType, index) => {
        const display = getItemDisplay(itemType, index);
        const isSelected = selectedSlot === index;

        return (
          <div
            key={index}
            onClick={() => display.available && onSelectItem(index)}
            style={{
              width: 60,
              height: 60,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: isSelected ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)',
              border: `2px solid ${display.available ? '#4ade80' : '#ef4444'}`,
              borderRadius: 4,
              cursor: display.available ? 'pointer' : 'not-allowed',
              opacity: display.available ? 1 : 0.6,
              transition: 'all 0.2s',
            }}
            title={`${display.name}: ${display.description} (${slotKeys[index]})`}
          >
            <div style={{ fontSize: 24, marginBottom: 2 }}>
              {display.icon}
            </div>
            <div style={{
              fontSize: 10,
              color: display.available ? '#4ade80' : '#ef4444',
              textAlign: 'center',
            }}>
              {display.cooldownText || (display.available ? slotKeys[index] : 'Wait')}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Quick action buttons for placing hazards
export function HazardPlacementUI({ isPlacing, onCancel, selectedItem }) {
  if (!isPlacing) return null;

  const item = SPECIAL_ITEMS[selectedItem];

  if (!item) {
    return (
      <div style={{
        position: 'fixed',
        top: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(0, 0, 0, 0.9)',
        padding: '10px 20px',
        borderRadius: 8,
        color: 'white',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        gap: 15,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20 }}>⚠️</span>
          <span>Select an item first</span>
        </div>
        <div style={{ fontSize: 12, color: '#ccc' }}>
          Use keys U,I,O,P to select a special item
        </div>
        <button
          onClick={onCancel}
          style={{
            padding: '5px 10px',
            background: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
          }}
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      top: 20,
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'rgba(0, 0, 0, 0.9)',
      padding: '10px 20px',
      borderRadius: 8,
      color: 'white',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      gap: 15,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 20 }}>{item.icon}</span>
        <span>Placing: {item.name}</span>
      </div>
      <div style={{ fontSize: 12, color: '#ccc' }}>
        Click on the ground to place
      </div>
      <button
        onClick={onCancel}
        style={{
          padding: '5px 10px',
          background: '#ef4444',
          color: 'white',
          border: 'none',
          borderRadius: 4,
          cursor: 'pointer',
        }}
      >
        Cancel
      </button>
    </div>
  );
}