
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

export type WardrobeCategory = 'tops' | 'bottoms' | 'footwear' | 'accessories';

export interface WardrobeItem {
  id: string;
  name: string;
  url: string;
  category: WardrobeCategory;
}

export interface OutfitLayer {
  garment: WardrobeItem | null;
  garments: WardrobeItem[];
  poseImages: Record<string, string>;
}

export interface SavedLook {
  id: string;
  imageUrl: string;
  timestamp: number;
  layers: OutfitLayer[];
}

export interface AvatarAssets {
  full: string;
  closeUp: string;
}

export interface UserProfile {
  username: string;
  email: string;
  details: {
    Gender: string;
    "Shirt Size": string;
    "Shoe Size": string;
    "Waist Size": string;
    "Cup Size": string;
  }
}

export interface ShopProduct {
  id: number;
  shopId: string;
  brand: string;
  price: number;
  image: string;
  originalImage?: string; // The source image (e.g. model wearing the item)
  bgColor: string;
  category: string;
  description: string;
  stock?: number;
}
