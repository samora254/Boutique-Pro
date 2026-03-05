
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloudIcon, ArrowLeftIcon, UserIcon, CheckCircleIcon } from './icons';
import { Compare } from './ui/compare';
import { generateAvatarAssets } from '../services/geminiService';
import { getFriendlyErrorMessage } from '../lib/utils';
import { AvatarAssets } from '../types';

interface StartScreenProps {
  onModelFinalized: (assets: AvatarAssets) => void;
  onBack?: () => void;
  savedAvatar?: AvatarAssets | null;
}

const StartScreen: React.FC<StartScreenProps> = ({ onModelFinalized, onBack, savedAvatar }) => {
  const [userImageUrl, setUserImageUrl] = useState<string | null>(null);
  const [generatedAssets, setGeneratedAssets] = useState<AvatarAssets | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Effect to handle model finalization once generated
  useEffect(() => {
    if (generatedAssets) {
      onModelFinalized(generatedAssets);
    }
  }, [generatedAssets, onModelFinalized]);

  const handleFileSelect = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
        setError('Please select an image file.');
        return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
        const dataUrl = e.target?.result as string;
        setUserImageUrl(dataUrl);
        setIsGenerating(true);
        setGeneratedAssets(null);
        setError(null);
        try {
            const result = await generateAvatarAssets(file);
            setGeneratedAssets(result);
        } catch (err) {
            setError(getFriendlyErrorMessage(err, 'Failed to create model'));
            setUserImageUrl(null);
        } finally {
            setIsGenerating(false);
        }
    };
    reader.readAsDataURL(file);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const screenVariants = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 },
  };
  
  // Use saved avatar assets if available. 
  // Reference Image logic: Left = Close Up, Right = Full Body
  const displayFirstImage = savedAvatar?.closeUp || "https://storage.googleapis.com/gemini-95-icons/asr-tryon.jpg";
  const displaySecondImage = savedAvatar?.full || "https://storage.googleapis.com/gemini-95-icons/asr-tryon-model.png";

  return (
    <AnimatePresence mode="wait">
      {!userImageUrl ? (
        <motion.div
          key="uploader"
          // Removed min-h-[80vh], changed justify-center to justify-start, reduced gap to gap-3, removed py-4
          className="w-full max-w-4xl mx-auto flex flex-col items-center justify-start min-h-0 py-0 px-4 gap-3 relative"
          variants={screenVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.4, ease: "easeInOut" }}
        >
          {/* Back Button */}
          {onBack && (
            <div className="absolute top-0 left-0 z-50">
               <button
                  onClick={onBack}
                  className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-gray-900 border border-gray-200 shadow-sm hover:bg-gray-50 active:scale-95 transition-all"
                  aria-label="Go Back"
              >
                  <ArrowLeftIcon className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Header Section - Minimalist */}
          {/* Removed mt-8 to bring it up */}
          <div className="text-center mt-2 sm:mt-0">
            <h1 className="text-xl md:text-2xl font-serif font-bold text-gray-900 leading-tight whitespace-nowrap">
              Try An Outfit Before You Buy
            </h1>
            {savedAvatar && (
                <p className="text-sm text-green-600 font-medium mt-2 flex items-center justify-center gap-1">
                    <UserIcon className="w-4 h-4" />
                    Using your saved avatar
                </p>
            )}
          </div>

          {/* Slider Section */}
          <div className="w-full flex justify-center">
            <Compare
              firstImage={displayFirstImage}
              secondImage={displaySecondImage}
              slideMode="drag"
              className="w-[280px] sm:w-[320px] aspect-[2/3] rounded-2xl bg-gray-200 shadow-xl ring-1 ring-black/5"
            />
          </div>

          {/* Action Section */}
          <div className="flex flex-col items-center w-full max-w-xs gap-3">
             {/* If saved avatar exists, show 'Continue' as primary action */}
             {savedAvatar && (
                 <button 
                    onClick={() => onModelFinalized(savedAvatar)}
                    className="w-full relative flex items-center justify-center px-6 py-3 text-base font-semibold text-white bg-green-600 rounded-full cursor-pointer group hover:bg-green-700 transition-all shadow-md hover:shadow-lg active:scale-95"
                 >
                     <CheckCircleIcon className="w-5 h-5 mr-3" />
                     Continue with Avatar
                 </button>
             )}

             <label htmlFor="image-upload-start" className={`w-full relative flex items-center justify-center px-6 py-3 text-base font-semibold rounded-full cursor-pointer group transition-all shadow-sm active:scale-95 ${savedAvatar ? 'bg-white text-gray-900 border border-gray-200 hover:bg-gray-50' : 'bg-gray-900 text-white hover:bg-gray-800 shadow-md hover:shadow-lg'}`}>
                  <UploadCloudIcon className="w-5 h-5 mr-3" />
                  {savedAvatar ? 'Upload New Photo' : 'Upload Your Photo'}
             </label>
             <input id="image-upload-start" type="file" className="hidden" accept="image/png, image/jpeg, image/webp, image/avif, image/heic, image/heif" onChange={handleFileChange} />
                
             <p className="text-gray-500 text-xs text-center">Select a clear, full-body photo.</p>
             <p className="text-gray-400 text-[10px] text-center max-w-[250px] leading-tight">By uploading, you agree not to create harmful, explicit, or unlawful content.</p>
             {error && <p className="text-red-500 text-sm text-center bg-red-50 p-2 rounded">{error}</p>}
          </div>
        </motion.div>
      ) : (
        <motion.div
            key="generating"
            className="w-full h-screen flex flex-col items-center justify-center bg-white"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            {/* Generating View Logic */}
            {generatedAssets ? (
                <div className="flex flex-col items-center gap-4">
                     <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                     <p className="font-serif text-xl text-gray-800">Finalizing...</p>
                </div>
            ) : (
                <div className="flex flex-col items-center gap-6 px-4 text-center">
                    <div className="relative">
                        <div className="w-20 h-20 border-4 border-gray-200 border-t-gray-800 rounded-full animate-spin"></div>
                         <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-xs font-bold text-gray-400">AI</span>
                         </div>
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-2xl font-serif text-gray-900">Creating Your Model</h2>
                        <p className="text-gray-500 max-w-xs mx-auto">Analyzing pose and lighting to create full-body and close-up assets...</p>
                    </div>
                </div>
            )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default StartScreen;