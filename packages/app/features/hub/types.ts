/**
 * SunShade Universal Player Hub — UI types shared across the 2D and 3D layers.
 */

export type ItemOrigin = string; // e.g. the game_id an item was earned in, or 'hub'
export type ItemUtility = 'cosmetic' | 'consumable' | 'avatar' | 'currency-booster' | 'badge';
export type ItemType = string; // free-form, e.g. 'skin', 'card-back', 'emote'
export type ItemStatus = 'equipped' | 'owned' | 'locked' | 'new';

export interface InventoryItem {
  id: string;
  name: string;
  origin: ItemOrigin;
  utility: ItemUtility;
  type: ItemType;
  status: ItemStatus;
  tags: string[]; // free-form tags layered on top of the four core facets
  thumbnailUrl: string; // lightweight 2D thumbnail — never the full 3D asset
  model3dRef?: string; // lazy-loaded only when entering 3D mode
}

export interface TagFilterState {
  origin: Set<ItemOrigin>;
  utility: Set<ItemUtility>;
  type: Set<ItemType>;
  status: Set<ItemStatus>;
}

export function emptyFilterState(): TagFilterState {
  return { origin: new Set(), utility: new Set(), type: new Set(), status: new Set() };
}
