
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect } from 'react';
import { RotateCcwIcon, ShirtIcon, SparklesIcon, DownloadIcon, CheckCircleIcon, ShareIcon, ArrowLeftIcon } from './icons';
import Spinner from './Spinner';
import { AnimatePresence, motion } from 'framer-motion';
import { addWatermark } from '../lib/utils';

interface CanvasProps {
  displayImageUrl: string | null;
  onStartOver: () => void;
  isLoading: boolean;
  loadingMessage: string;
  onSelectPose: (index: number) => void;
  poseInstructions: string[];
  currentPoseIndex: number;
  pendingPoseIndex: number | null;
  poseErrorIndex: number | null;
  availablePoseKeys: string[];
  onOpenWardrobe: () => void;
  onOpenVibeCheck: () => void;
  onSaveLook: () => void;
  showSaveButton: boolean;
  isSaving: boolean;
  isSaved: boolean;
  onBack?: () => void;
}

const Canvas: React.FC<CanvasProps> = ({ 
  displayImageUrl, 
  onStartOver, 
  isLoading, 
  loadingMessage, 
  onSelectPose, 
  poseInstructions, 
  currentPoseIndex, 
  pendingPoseIndex,
  poseErrorIndex,
  availablePoseKeys,
  onOpenWardrobe,
  onOpenVibeCheck,
  onSaveLook,
  showSaveButton,
  isSaving,
  isSaved,
  onBack
}) => {
  const [showBuyNotification, setShowBuyNotification] = useState(false);
  const [watermarkedSrc, setWatermarkedSrc] = useState<string | null>(null);
  
  // Check if the current loading state is specifically for a pose change
  const isPoseLoading = isLoading && loadingMessage === 'Changing pose...';
  // Show the full screen overlay only if it's NOT a pose change (e.g. adding garment)
  const showMainOverlay = isLoading && !isPoseLoading;

  // Generate watermark in background for the "Ghost Layer"
  useEffect(() => {
    let active = true;
    if (displayImageUrl) {
      addWatermark(displayImageUrl).then((blob) => {
        if (active) {
          const url = URL.createObjectURL(blob);
          setWatermarkedSrc(url);
        }
      });
    } else {
      setWatermarkedSrc(null);
    }

    return () => {
      active = false;
      if (watermarkedSrc) URL.revokeObjectURL(watermarkedSrc);
    };
  }, [displayImageUrl]);

  const handleShare = async () => {
    const userName = "Guest Stylist";
    // Construct a clean URL without existing query params
    const baseUrl = window.location.origin + window.location.pathname;
    const shareUrl = new URL(baseUrl);
    shareUrl.searchParams.set('stylist', userName);
    const urlToShare = shareUrl.toString();

    const shareData: ShareData = {
      title: 'Boutique Pro',
      text: `Check out this fit on Boutique Pro! Styled by ${userName}`,
      url: urlToShare,
    };

    let dataToShare = shareData;

    // Always prefer sharing the watermarked version if ready
    const imageToShare = watermarkedSrc || displayImageUrl;

    if (imageToShare) {
        try {
            const response = await fetch(imageToShare);
            const blob = await response.blob();
            const file = new File([blob], 'boutique-pro-look.png', { type: blob.type });
            
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
        // Ignore abort errors (user cancelled share)
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
                 alert('Could not share. Please copy this URL: ' + text);
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

  const handleBuyClick = () => {
      if (showBuyNotification) return;
      setShowBuyNotification(true);
      setTimeout(() => setShowBuyNotification(false), 2000);
  };

  return (
    <div className="w-full h-full flex flex-col items-center relative animate-zoom-in group">
      {/* Top Buttons Container */}
      <div className="absolute top-4 left-4 z-30 flex items-center gap-2">
          {onBack && (
              <button
                  onClick={onBack}
                  className="flex items-center justify-center w-8 h-8 bg-white/60 border border-gray-300/80 text-gray-700 rounded-full transition-all duration-200 ease-in-out hover:bg-white hover:border-gray-400 active:scale-95 text-xs backdrop-blur-sm shadow-sm"
              >
                  <ArrowLeftIcon className="w-4 h-4" />
              </button>
          )}

          <button 
              onClick={onStartOver}
              className="flex items-center justify-center text-center bg-white/60 border border-gray-300/80 text-gray-700 font-semibold py-2 px-3 rounded-full transition-all duration-200 ease-in-out hover:bg-white hover:border-gray-400 active:scale-95 text-xs backdrop-blur-sm shadow-sm"
          >
              <RotateCcwIcon className="w-3 h-3 mr-1.5" />
              Start Over
          </button>
      </div>

      {/* Image Display or Placeholder */}
      <div className="relative flex-grow min-h-0 w-full flex items-center justify-center px-0 py-0">
        {displayImageUrl ? (
          /* LOCKED CANVAS SIZE: Fixed 3:4 Aspect Ratio Container */
          <div className="relative w-full max-w-[360px] aspect-[3/4] shadow-lg rounded-xl bg-gray-100 flex-shrink-0">
             
             {/* Save Button (High Z-Index to sit above transparent image) */}
             {showSaveButton && (
                <div className="absolute -top-3 right-3 z-50">
                    <button
                        onClick={onSaveLook}
                        disabled={isSaving || isSaved}
                        className={`
                            flex items-center justify-center p-2.5 rounded-full shadow-lg border transition-all group/save
                            ${isSaved 
                                ? 'bg-white border-green-500 text-green-600' 
                                : 'bg-white border-gray-100 text-gray-700 hover:bg-gray-50 hover:border-gray-300 active:scale-95'
                            }
                        `}
                        title="Save Look"
                    >
                        {isSaving ? (
                            <svg className="animate-spin h-5 w-5 text-gray-800" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : isSaved ? (
                            <CheckCircleIcon className="w-5 h-5" />
                        ) : (
                            <DownloadIcon className="w-5 h-5 text-gray-800" />
                        )}
                    </button>
                </div>
             )}

             {/* Wrapper */}
             <div className="relative w-full h-full rounded-xl overflow-hidden bg-gray-50">
                
                {/* 1. VISIBLE CLEAN IMAGE (Bottom Layer) */}
                <img
                    key={displayImageUrl}
                    src={displayImageUrl}
                    alt="Virtual try-on model"
                    className="absolute inset-0 w-full h-full object-contain transition-opacity duration-500 animate-fade-in z-0 select-none"
                    onContextMenu={(e) => e.preventDefault()}
                    style={{ WebkitTouchCallout: 'none' }}
                    draggable={false}
                />

                {/* 2. INVISIBLE WATERMARKED IMAGE (Top Layer) */}
                {/* This opacity-0 layer captures right-clicks/long-presses for saving */}
                {watermarkedSrc && (
                    <img
                        src={watermarkedSrc}
                        alt="Virtual try-on model watermarked"
                        className="absolute inset-0 w-full h-full object-contain opacity-0 z-10 select-none"
                        onContextMenu={(e) => {
                             e.preventDefault();
                        }}
                        style={{ WebkitTouchCallout: 'none' }}
                        draggable={false}
                    />
                )}
                
                {/* Action Buttons Container (Bottom Right) - Z-50 to sit ABOVE the invisible image */}
                <div className="absolute bottom-3 right-3 flex items-center gap-2 z-50 pointer-events-auto">
                    
                    {/* Buy Button Wrapper */}
                    <div className="relative">
                        <AnimatePresence>
                            {showBuyNotification && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.9 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.9 }}
                                    className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1 bg-gray-900 text-white text-[10px] font-medium rounded-lg shadow-xl whitespace-nowrap pointer-events-none backdrop-blur-sm"
                                >
                                    Coming Soon
                                    {/* Tiny arrow */}
                                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <button
                            onClick={handleBuyClick} 
                            className="h-10 px-5 rounded-full shadow-lg border border-gray-100 bg-white text-gray-900 font-semibold text-xs hover:bg-gray-50 active:scale-95 transition-all flex items-center justify-center"
                            title="Buy Outfit"
                        >
                            Buy
                        </button>
                    </div>

                    {/* Minimalist Share Button */}
                    <button
                        onClick={handleShare}
                        className="w-10 h-10 flex items-center justify-center rounded-full shadow-lg border border-gray-100 bg-white text-gray-900 hover:bg-gray-50 active:scale-95 transition-all"
                        title="Share App"
                    >
                        <ShareIcon className="w-5 h-5" />
                    </button>
                </div>
                
                <AnimatePresence>
                {showMainOverlay && (
                    <motion.div
                        className="absolute inset-0 bg-white/80 backdrop-blur-md flex flex-col items-center justify-center z-40"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <Spinner />
                        {loadingMessage && (
                            <p className="text-lg font-serif text-gray-700 mt-4 text-center px-4">{loadingMessage}</p>
                        )}
                    </motion.div>
                )}
                </AnimatePresence>
            </div>
          </div>
        ) : (
            <div className="w-full max-w-[360px] aspect-[3/4] bg-gray-100 border border-gray-200 rounded-xl flex flex-col items-center justify-center shadow-inner">
              <Spinner />
              <p className="text-md font-serif text-gray-600 mt-4">Loading Model...</p>
            </div>
        )}
      </div>

      {/* Controls Container - Pushed to bottom with mt-auto */}
      <div className="flex-shrink-0 w-full flex flex-col items-center justify-center z-30 px-2 pb-2 pt-1 gap-1.5 mt-auto bg-gradient-to-t from-white via-white/90 to-transparent">
          
          {/* Pose Controls */}
          <div className="flex flex-col items-center gap-1 w-full max-w-[360px]">
            <div className="grid grid-cols-3 sm:flex sm:flex-wrap items-center justify-center gap-1 p-1 bg-white/90 backdrop-blur-lg border border-gray-200 rounded-xl shadow-sm w-full">
                {poseInstructions.map((_, index) => {
                    const isActive = currentPoseIndex === index;
                    const isThisPoseLoading = pendingPoseIndex === index;
                    const isError = poseErrorIndex === index;

                    return (
                        <button
                            key={index}
                            onClick={() => onSelectPose(index)}
                            disabled={isLoading && !isThisPoseLoading}
                            className={`
                                relative flex items-center justify-center px-1.5 py-1.5 text-[10px] sm:text-xs font-medium rounded-lg transition-all duration-300 whitespace-nowrap
                                ${isActive 
                                    ? 'bg-gray-900 text-white shadow-md' 
                                    : isError
                                      ? 'text-red-600 bg-red-50 border border-red-200'
                                      : 'text-gray-600 hover:bg-gray-100 bg-transparent'
                                }
                                ${isLoading && !isThisPoseLoading ? 'opacity-50 cursor-not-allowed' : ''}
                            `}
                        >
                            {isThisPoseLoading ? (
                                <div className="flex items-center gap-1">
                                    <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                </div>
                            ) : (
                                <span>Pose {index + 1}</span>
                            )}
                        </button>
                    );
                })}
            </div>
            {poseErrorIndex !== null && (
               <motion.p
                 initial={{ opacity: 0, height: 0 }}
                 animate={{ opacity: 1, height: 'auto' }}
                 exit={{ opacity: 0, height: 0 }}
                 className="text-red-500 text-[10px] font-serif italic text-center"
               >
                 Oops! sorry. Try again.
               </motion.p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-center gap-1.5 w-full max-w-[360px]">
             <button 
                onClick={onOpenWardrobe}
                className="flex-1 flex items-center justify-center px-2 py-2 bg-white border border-gray-200 rounded-xl text-gray-700 font-medium text-xs hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm active:scale-95"
             >
                 <ShirtIcon className="w-3.5 h-3.5 mr-1.5 text-gray-500" />
                 Wardrobe
             </button>
             <button 
                onClick={onOpenVibeCheck}
                className="flex-1 flex items-center justify-center px-2 py-2 bg-white border border-gray-200 rounded-xl text-gray-700 font-medium text-xs hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm active:scale-95"
             >
                 <SparklesIcon className="w-3.5 h-3.5 mr-1.5 text-gray-500" />
                 Vibe Check
             </button>
          </div>

        </div>
    </div>
  );
};

export default Canvas;
