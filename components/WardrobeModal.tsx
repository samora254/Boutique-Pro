
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useMemo } from 'react';
import type { WardrobeItem, WardrobeCategory } from '../types';
import { CheckCircleIcon } from './icons';
import Spinner from './Spinner';
import { AnimatePresence, motion } from 'framer-motion';

interface WardrobePanelProps {
  onGarmentSelect: (items: { file: File; info: WardrobeItem }[]) => void;
  activeGarmentIds: string[];
  isLoading: boolean;
  wardrobe: WardrobeItem[];
  pendingGarmentIds: string[];
}

// Robust helper to convert image URL to a File object
const urlToFile = async (url: string, filename: string): Promise<File> => {
    // Strategy 1: Standard Fetch (Handles standard CORS, bypasses cache issues with 'no-store')
    try {
        const response = await fetch(url, { mode: 'cors', cache: 'no-store' });
        if (!response.ok) throw new Error(`Fetch failed: ${response.statusText}`);
        const blob = await response.blob();
        return new File([blob], filename, { type: blob.type || 'image/png' });
    } catch (err) {
        console.warn("Standard fetch failed, trying canvas fallback", err);
    }

    // Strategy 2: Canvas (Original Method - Good for legacy support or forcing image decoding)
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.setAttribute('crossOrigin', 'anonymous');

        image.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = image.naturalWidth;
            canvas.height = image.naturalHeight;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                return reject(new Error('Could not get canvas context.'));
            }
            ctx.drawImage(image, 0, 0);

            canvas.toBlob((blob) => {
                if (!blob) {
                    return reject(new Error('Canvas toBlob failed.'));
                }
                const mimeType = blob.type || 'image/png';
                const file = new File([blob], filename, { type: mimeType });
                resolve(file);
            }, 'image/png');
        };

        image.onerror = (error) => {
            reject(new Error(`Could not load image from URL for canvas conversion. This is likely a CORS issue. Please ensure your storage bucket has CORS enabled.`));
        };

        // Append timestamp to avoid browser cache lock
        image.src = url + (url.includes('?') ? '&' : '?') + 't=' + new Date().getTime();
    });
};

const CATEGORIES: { id: WardrobeCategory; label: string }[] = [
    { id: 'tops', label: 'Tops' },
    { id: 'bottoms', label: 'Bottoms' },
    { id: 'footwear', label: 'Footwear' },
    { id: 'accessories', label: 'Accessories' },
];

const WardrobePanel: React.FC<WardrobePanelProps> = ({ onGarmentSelect, activeGarmentIds, isLoading, wardrobe, pendingGarmentIds }) => {
    // Single page view, no activeCategory state needed.
    const [isFullCheckMode, setIsFullCheckMode] = useState(false);
    
    // Track selections for each category in Full Check mode
    const [selectedItemsForCheck, setSelectedItemsForCheck] = useState<Record<WardrobeCategory, WardrobeItem | null>>({
        tops: null,
        bottoms: null,
        footwear: null,
        accessories: null,
    });
    
    const [error, setError] = useState<string | null>(null);
    const [preparingCheck, setPreparingCheck] = useState(false);

    const handleGarmentClick = async (item: WardrobeItem) => {
        if (isLoading || pendingGarmentIds.length > 0 || preparingCheck) return;
        
        // Prevent selecting already worn items in single mode, but allow re-selection/toggling in full check
        if (!isFullCheckMode && activeGarmentIds.includes(item.id)) return;

        setError(null);

        if (isFullCheckMode) {
            // Toggle selection logic for Full Check
            setSelectedItemsForCheck(prev => {
                // If clicking the currently selected item for this category, deselect it.
                // Otherwise select the new one.
                const isSelected = prev[item.category]?.id === item.id;
                return {
                    ...prev,
                    [item.category]: isSelected ? null : item
                };
            });
        } else {
            // Standard Mode: Immediate Action
            try {
                const file = await urlToFile(item.url, item.name);
                onGarmentSelect([{ file, info: item }]);
            } catch (err) {
                const detailedError = `Failed to load wardrobe item. The image server blocked the request. Please check CORS settings in Admin > Storage Manager.`;
                setError(detailedError);
                console.error(`[CORS Check] Failed to load wardrobe item: ${item.url}`, err);
            }
        }
    };

    const handleCheckNow = async () => {
        const itemsToProcess = Object.values(selectedItemsForCheck).filter(Boolean) as WardrobeItem[];
        if (itemsToProcess.length === 0) return;

        setPreparingCheck(true);
        setError(null);

        try {
            const filePromises = itemsToProcess.map(async (item) => {
                 const file = await urlToFile(item.url, item.name);
                 return { file, info: item };
            });
            const filesAndInfos = await Promise.all(filePromises);
            onGarmentSelect(filesAndInfos);
            // Reset selection after sending
            setSelectedItemsForCheck({ tops: null, bottoms: null, footwear: null, accessories: null });
            setIsFullCheckMode(false);
        } catch (err) {
            setError("Failed to prepare items for checking. Please check CORS settings.");
            console.error(err);
        } finally {
            setPreparingCheck(false);
        }
    };

    const hasSelectedItems = Object.values(selectedItemsForCheck).some(Boolean);

  return (
    <div className="flex flex-col h-full bg-white relative">
        {/* Header Controls */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0 bg-white z-10">
             <div className="flex flex-col">
                <h2 className="text-lg font-serif text-gray-900">Wardrobe</h2>
                <p className="text-xs text-gray-400">
                    {isFullCheckMode ? 'Select multiple items' : 'Tap to try on'}
                </p>
             </div>
             
             <button
                onClick={() => {
                    const newMode = !isFullCheckMode;
                    setIsFullCheckMode(newMode);
                    if (!newMode) {
                        // Reset selections when exiting full check to avoid confusion
                        setSelectedItemsForCheck({ tops: null, bottoms: null, footwear: null, accessories: null });
                    }
                }}
                className={`text-xs font-semibold px-4 py-2 rounded-full border transition-all ${
                    isFullCheckMode 
                    ? 'bg-gray-900 text-white border-gray-900 shadow-md' 
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
             >
                {isFullCheckMode ? 'Exit Selection' : 'Select Multiple'}
             </button>
        </div>

        {/* Scrollable Main Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-0 pb-24">
             {CATEGORIES.map((cat) => {
                const categoryItems = wardrobe.filter(item => item.category === cat.id);
                
                return (
                    <div key={cat.id} className="flex flex-col mb-6 mt-4 pl-4">
                        <div className="flex items-center justify-between pr-4 mb-2">
                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">{cat.label}</h3>
                            <span className="text-[10px] text-gray-400 font-medium">{categoryItems.length} items</span>
                        </div>

                        {/* Horizontal Scroll Container */}
                        <div className="flex overflow-x-auto gap-3 pb-4 pr-4 scrollbar-hide snap-x">
                            
                            {/* Empty State for Category */}
                            {categoryItems.length === 0 && (
                                <div className="flex items-center justify-center w-28 h-36 border border-gray-100 rounded-xl bg-gray-50 text-gray-300">
                                    <span className="text-[10px]">Empty</span>
                                </div>
                            )}

                            {/* Items */}
                            {categoryItems.map((item) => {
                                const isActive = activeGarmentIds.includes(item.id); 
                                const isPending = pendingGarmentIds.includes(item.id); 
                                
                                const isSelectedForBatch = isFullCheckMode && selectedItemsForCheck[cat.id]?.id === item.id;
                                
                                const isDisabled = isLoading || (pendingGarmentIds.length > 0 && !isPending) || (isActive && !isFullCheckMode);

                                return (
                                    <button
                                    key={item.id}
                                    onClick={() => handleGarmentClick(item)}
                                    disabled={isDisabled}
                                    className={`
                                        relative w-28 h-36 flex-shrink-0 border rounded-xl overflow-hidden transition-all duration-200 group bg-white snap-start
                                        ${isSelectedForBatch ? 'ring-2 ring-gray-900 border-gray-900' : 'border-gray-200'}
                                        ${isDisabled ? 'opacity-60 cursor-not-allowed' : 'hover:shadow-md cursor-pointer'}
                                    `}
                                    aria-label={`Select ${item.name}`}
                                    >
                                    <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
                                    
                                    <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${isSelectedForBatch ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                        <p className="text-white text-[10px] font-bold text-center p-1 line-clamp-2">{item.name}</p>
                                    </div>
                                    
                                    {/* Active Indicator (Already worn) */}
                                    {isActive && !isSelectedForBatch && (
                                        <div className="absolute top-2 right-2 bg-white/90 rounded-full p-1 shadow-sm z-10">
                                             <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                                        </div>
                                    )}

                                    {/* Checkmark for Batch Selection */}
                                    {isSelectedForBatch && (
                                         <div className="absolute inset-0 bg-gray-900/40 flex items-center justify-center backdrop-blur-[1px] z-10">
                                            <CheckCircleIcon className="w-6 h-6 text-white" />
                                        </div>
                                    )}

                                    {/* Loading Spinner */}
                                    {isPending && (
                                        <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-20 backdrop-blur-[2px]">
                                            <div className="scale-50">
                                                <Spinner />
                                            </div>
                                        </div>
                                    )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                );
             })}
        </div>

        {/* Floating Action Bar for Full Check */}
        <AnimatePresence>
            {isFullCheckMode && (
                <motion.div
                    initial={{ y: 100 }}
                    animate={{ y: 0 }}
                    exit={{ y: 100 }}
                    className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 shadow-[0_-4px_15px_-3px_rgba(0,0,0,0.1)] z-20"
                >
                    <div className="flex items-center justify-between max-w-lg mx-auto">
                        <div className="flex flex-col">
                            <span className="text-sm font-bold text-gray-900">
                                {Object.values(selectedItemsForCheck).filter(Boolean).length} Items Selected
                            </span>
                            <span className="text-[10px] text-gray-500">Ready to combine</span>
                        </div>
                        <button
                            onClick={handleCheckNow}
                            disabled={!hasSelectedItems || preparingCheck}
                            className="bg-gray-900 text-white px-6 py-3 rounded-xl text-sm font-bold shadow-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
                        >
                            {preparingCheck ? 'Generating...' : 'Vibe Check'}
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
        
        {error && (
             <div className="absolute bottom-24 left-4 right-4 p-3 bg-red-50 text-red-600 text-xs rounded-lg border border-red-100 text-center shadow-sm z-30">
                {error}
            </div>
        )}
    </div>
  );
};

export default WardrobePanel;
