import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { SpecialItemsProvider, useSpecialItems, SPECIAL_ITEM_TYPES, SPECIAL_ITEMS } from '../contexts/SpecialItemsContext.jsx';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock Date.now
const mockNow = 1000000000;
vi.spyOn(Date, 'now').mockReturnValue(mockNow);

describe('SpecialItemsContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    localStorageMock.setItem.mockImplementation(() => {});
  });

  it('should initialize with empty inventory', () => {
    const { result } = renderHook(() => useSpecialItems(), {
      wrapper: SpecialItemsProvider,
    });

    expect(result.current.inventory).toEqual([null, null, null, null]);
  });

  it('should equip item in slot', () => {
    const { result } = renderHook(() => useSpecialItems(), {
      wrapper: SpecialItemsProvider,
    });

    act(() => {
      result.current.equipItem(0, SPECIAL_ITEM_TYPES.VACUUM_PORTAL);
    });

    expect(result.current.inventory[0]).toBe(SPECIAL_ITEM_TYPES.VACUUM_PORTAL);
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'specialItemsInventory',
      JSON.stringify([SPECIAL_ITEM_TYPES.VACUUM_PORTAL, null, null, null])
    );
  });

  it('should unequip item from slot', () => {
    const { result } = renderHook(() => useSpecialItems(), {
      wrapper: SpecialItemsProvider,
    });

    act(() => {
      result.current.equipItem(0, SPECIAL_ITEM_TYPES.VACUUM_PORTAL);
      result.current.unequipItem(0);
    });

    expect(result.current.inventory[0]).toBeNull();
  });

  it('should check cooldown status', () => {
    const { result } = renderHook(() => useSpecialItems(), {
      wrapper: SpecialItemsProvider,
    });

    // Initially not on cooldown
    expect(result.current.isOnCooldown(SPECIAL_ITEM_TYPES.VACUUM_PORTAL)).toBe(false);

    // Start cooldown
    act(() => {
      result.current.startCooldown(SPECIAL_ITEM_TYPES.VACUUM_PORTAL);
    });

    expect(result.current.isOnCooldown(SPECIAL_ITEM_TYPES.VACUUM_PORTAL)).toBe(true);
    expect(result.current.getCooldownRemaining(SPECIAL_ITEM_TYPES.VACUUM_PORTAL)).toBe(15000);
  });

  it('should handle support vectors recharge', () => {
    const { result } = renderHook(() => useSpecialItems(), {
      wrapper: SpecialItemsProvider,
    });

    // Initially at 0%
    expect(result.current.supportVectorsCharge).toBe(0);

    // Add kills
    act(() => {
      result.current.addKills(30);
    });

    expect(result.current.supportVectorsCharge).toBe(25);

    // Add more kills
    act(() => {
      result.current.addKills(30);
    });

    expect(result.current.supportVectorsCharge).toBe(50);
  });

  it('should use support vectors when fully charged', () => {
    const { result } = renderHook(() => useSpecialItems(), {
      wrapper: SpecialItemsProvider,
    });

    // Charge to 100%
    act(() => {
      result.current.addKills(120); // 4 * 30 = 120 kills = 100%
    });

    expect(result.current.supportVectorsCharge).toBe(100);

    // Use item
    const success = result.current.useItem(SPECIAL_ITEM_TYPES.SUPPORT_VECTORS);

    expect(success).toBe(true);
    expect(result.current.supportVectorsCharge).toBe(0);
  });

  it('should prevent using item on cooldown', () => {
    const { result } = renderHook(() => useSpecialItems(), {
      wrapper: SpecialItemsProvider,
    });

    // Start cooldown
    act(() => {
      result.current.startCooldown(SPECIAL_ITEM_TYPES.VACUUM_PORTAL);
    });

    // Try to use item
    const success = result.current.useItem(SPECIAL_ITEM_TYPES.VACUUM_PORTAL);

    expect(success).toBe(false);
  });

  it('should allow using item when not on cooldown', () => {
    const { result } = renderHook(() => useSpecialItems(), {
      wrapper: SpecialItemsProvider,
    });

    // Equip item
    act(() => {
      result.current.equipItem(0, SPECIAL_ITEM_TYPES.VACUUM_PORTAL);
    });

    // Use item
    const success = result.current.useItem(SPECIAL_ITEM_TYPES.VACUUM_PORTAL);

    expect(success).toBe(true);
    expect(result.current.isOnCooldown(SPECIAL_ITEM_TYPES.VACUUM_PORTAL)).toBe(true);
  });

  it('should get correct item in slot', () => {
    const { result } = renderHook(() => useSpecialItems(), {
      wrapper: SpecialItemsProvider,
    });

    act(() => {
      result.current.equipItem(1, SPECIAL_ITEM_TYPES.BLEACH_BLOCKS);
    });

    expect(result.current.getItemInSlot(1)).toBe(SPECIAL_ITEM_TYPES.BLEACH_BLOCKS);
    expect(result.current.getItemInSlot(0)).toBeNull();
    expect(result.current.hasItemInSlot(1)).toBe(true);
    expect(result.current.hasItemInSlot(0)).toBe(false);
  });
});