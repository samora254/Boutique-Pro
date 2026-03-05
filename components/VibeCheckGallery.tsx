
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect } from 'react';
import { SavedLook } from '../types';
import { LayersIcon, ShareIcon } from './icons';
import { motion, AnimatePresence } from 'framer-motion';
import { addWatermark } from '../lib/utils';

interface VibeCheckGalleryProps {
    savedLooks: SavedLook[];
}

const VibeCheckGallery: React.FC<VibeCheckGalleryProps> = ({ savedLooks }) => {
    const [selectedLook, setSelectedLook] = useState<SavedLook | null>(null);
    const [watermarkedDetailSrc, setWatermarkedDetailSrc] = useState<string | null>(null);

    // Generate watermarked version when a look is selected for detail view
    useEffect(() => {
        let active = true;
        if (selectedLook?.imageUrl) {
            addWatermark(selectedLook.imageUrl).then(blob => {
                if (active) {
                    setWatermarkedDetailSrc(URL.createObjectURL(blob));
                }
            });
        } else {
            setWatermarkedDetailSrc(null);
        }
        return () => {
            active = false;
            if (watermarkedDetailSrc) URL.revokeObjectURL(watermarkedDetailSrc);
        };
    }, [selectedLook]);

    const handleShare = async (e: React.MouseEvent) => {
        e.stopPropagation();
        
        const userName = "Guest Stylist";
        const baseUrl = window.location.origin + window.location.pathname;
        const shareUrl = new URL(baseUrl);
        shareUrl.searchParams.set('stylist', userName);
        const urlToShare = shareUrl.toString();

        const shareData: ShareData = {
          title: 'Boutique Pro',
          text: `Check out this vibe by ${userName}!`,
          url: urlToShare,
        };
        
        let dataToShare = shareData;

        // Try to attach image if available from selectedLook
        // Use the watermarked version if generated, otherwise clean
        const imageToShare = watermarkedDetailSrc || selectedLook?.imageUrl;

        if (imageToShare) {
            try {
                const response = await fetch(imageToShare);
                const blob = await response.blob();
                const file = new File([blob], 'boutique-pro-vibe.png', { type: blob.type });
                
                if (navigator.canShare && navigator.canShare({ ...shareData, files: [file] })) {
                     dataToShare = { ...shareData, files: [file] };
                }
            } catch (err) {
                console.warn('Could not attach image to share', err);
            }
        }
    
        try {
            if (navigator.share && navigator.canShare(dataToShare)) {
                await navigator.share(dataToShare);
            } else {
                throw new Error("Share API not supported");
            }
        } catch (err) {
            if (err instanceof Error && err.name === 'AbortError') {
                return;
            }
            
            // Robust Clipboard Fallback
            const copyToClipboardFallback = (text: string) => {
                 const textArea = document.createElement("textarea");
                 textArea.value = text;
                 textArea.style.position = "fixed";
                 textArea.style.left = "-9999px";
                 document.body.appendChild(textArea);
                 textArea.focus();
                 textArea.select();
                 try {
                     document.execCommand('copy');
                     alert('Link copied to clipboard!');
                 } catch (e) {
                     alert('Could not share or copy link. URL: ' + text);
                 } finally {
                     document.body.removeChild(textArea);
                 }
            };

            try {
                await navigator.clipboard.writeText(urlToShare);
                alert('Link copied to clipboard!');
            } catch (clipboardErr) {
                copyToClipboardFallback(urlToShare);
            }
        }
      };

    return (
        <div className="flex flex-col h-full">
            <AnimatePresence mode="wait">
                {!selectedLook ? (
                    <motion.div 
                        key="gallery"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="grid grid-cols-2 gap-4"
                    >
                        {savedLooks.length === 0 ? (
                            <div className="col-span-2 flex flex-col items-center justify-center py-10 text-center opacity-60">
                                <p className="text-4xl mb-2">✨</p>
                                <p className="text-gray-900 font-medium">No saved vibes yet</p>
                                <p className="text-sm text-gray-500">Save your fit checks to see them here.</p>
                            </div>
                        ) : (
                            savedLooks.map((look) => (
                                <button 
                                    key={look.id}
                                    onClick={() => setSelectedLook(look)}
                                    className="relative aspect-[3/4] rounded-xl overflow-hidden group shadow-sm hover:shadow-md transition-all border border-gray-200"
                                >
                                    <img 
                                        src={look.imageUrl} 
                                        alt="Saved Look" 
                                        className="w-full h-full object-cover select-none"
                                        onContextMenu={(e) => e.preventDefault()}
                                        style={{ WebkitTouchCallout: 'none' }} 
                                        draggable={false}
                                    />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-end p-2">
                                        <p className="text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                                            {new Date(look.timestamp).toLocaleDateString()}
                                        </p>
                                    </div>
                                </button>
                            ))
                        )}
                    </motion.div>
                ) : (
                    <motion.div 
                        key="detail"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="flex flex-col h-full"
                    >
                        <button 
                            onClick={() => setSelectedLook(null)}
                            className="text-sm text-gray-500 hover:text-gray-900 mb-4 flex items-center"
                        >
                            ← Back to Gallery
                        </button>
                        
                        <div className="flex gap-4 h-full overflow-hidden">
                            <div className="w-1/2 rounded-xl overflow-hidden border border-gray-200 relative group">
                                
                                {/* 1. Visible Clean Image */}
                                <img 
                                    src={selectedLook.imageUrl} 
                                    alt="Look Detail" 
                                    className="absolute inset-0 w-full h-full object-cover z-0 select-none"
                                    onContextMenu={(e) => e.preventDefault()}
                                    style={{ WebkitTouchCallout: 'none' }} 
                                    draggable={false}
                                />

                                {/* 2. Invisible Watermarked Image Overlay */}
                                {watermarkedDetailSrc && (
                                     <img 
                                        src={watermarkedDetailSrc} 
                                        alt="Look Detail Watermarked" 
                                        className="absolute inset-0 w-full h-full object-cover opacity-0 z-10 select-none" 
                                        onContextMenu={(e) => e.preventDefault()}
                                        style={{ WebkitTouchCallout: 'none' }} 
                                        draggable={false}
                                    />
                                )}
                                
                                {/* Minimalist Share Button in Bottom Right (Above invisible image) */}
                                <button
                                    onClick={handleShare}
                                    className="absolute bottom-2 right-2 p-2 rounded-full shadow-md border border-gray-100 bg-white text-gray-900 hover:bg-gray-50 active:scale-95 transition-all z-20 pointer-events-auto"
                                    title="Share Vibe"
                                >
                                    <ShareIcon className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="w-1/2 flex flex-col">
                                <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center">
                                    <LayersIcon className="w-4 h-4 mr-2"/>
                                    Outfit Composition
                                </h3>
                                <div className="space-y-3 overflow-y-auto pr-1">
                                    {selectedLook.layers.map((layer, idx) => {
                                        // Handle both single garment and batch garments
                                        const garments = layer.garments && layer.garments.length > 0 
                                            ? layer.garments 
                                            : (layer.garment ? [layer.garment] : []);

                                        if (garments.length === 0) return null;

                                        return (
                                            <div key={idx} className="bg-gray-50 p-2 rounded-lg border border-gray-100">
                                                <p className="text-xs font-semibold text-gray-400 mb-1">Layer {idx + 1}</p>
                                                <div className="space-y-2">
                                                    {garments.map((g) => (
                                                        <div key={g.id} className="flex items-center gap-2">
                                                            <img src={g.url} className="w-8 h-8 rounded object-cover border border-gray-200" />
                                                            <span className="text-xs font-medium text-gray-800 line-clamp-1">{g.name}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default VibeCheckGallery;
