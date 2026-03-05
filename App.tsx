
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import StartScreen from './components/StartScreen';
import Canvas from './components/Canvas';
import WardrobePanel from './components/WardrobeModal';
import Modal from './components/Modal';
import VibeCheckGallery from './components/VibeCheckGallery';
import Navbar from './components/Navbar';
import ProfilePanel from './components/ProfilePanel';
import ShopHome from './components/ShopHome';
import AdminDashboard from './components/AdminDashboard';
import SupabaseStorageManager from './components/SupabaseStorageManager';
import { generateVirtualTryOnImage, generatePoseVariation, generateAvatarAssets } from './services/geminiService';
import { OutfitLayer, WardrobeItem, SavedLook, AvatarAssets, WardrobeCategory, UserProfile, ShopProduct } from './types';
import { defaultWardrobe } from './wardrobe';
import Footer from './components/Footer';
import { getFriendlyErrorMessage, addWatermark } from './lib/utils';
import Spinner from './components/Spinner';
import { useScreenProtection } from './hooks/useScreenProtection';
import { UploadCloudIcon, XIcon } from './components/icons';

const POSE_INSTRUCTIONS = [
  "Full frontal view, hands on hips",
  "Slightly turned, 3/4 view",
  "Side profile view",
  "Jumping in the air, mid-action shot",
  "Walking towards camera",
  "Leaning against a wall",
];

const INITIAL_PRODUCTS: ShopProduct[] = [
  { id: 101, shopId: 'vazi', brand: 'URBAN BOMBER', price: 8500, image: 'https://images.unsplash.com/photo-1551028919-ac66e624ec06?auto=format&fit=crop&w=800&q=80', bgColor: 'bg-white', category: 'jackets', description: "Classic bomber jacket in olive green.", stock: 12 },
  { id: 102, shopId: 'vazi', brand: 'OXFORD ESSENTIAL', price: 4500, image: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=800&q=80', bgColor: 'bg-white', category: 'tops', description: "Crisp white button-down oxford.", stock: 45 },
  { id: 103, shopId: 'vazi', brand: 'STRAIGHT LEG DENIM', price: 5200, image: 'https://images.unsplash.com/photo-1542272454315-4c01d7abdf4a?auto=format&fit=crop&w=800&q=80', bgColor: 'bg-white', category: 'jeans', description: "Raw indigo denim.", stock: 22 },
  { id: 104, shopId: 'vazi', brand: 'MEN\'S CHINOS', price: 3800, image: 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?auto=format&fit=crop&w=800&q=80', bgColor: 'bg-white', category: 'trousers', description: "Versatile khaki chinos.", stock: 18 },
  { id: 105, shopId: 'vazi', brand: 'LEATHER CHELSEA', price: 12500, image: 'https://images.unsplash.com/photo-1638247025967-b4e38f787b76?auto=format&fit=crop&w=800&q=80', bgColor: 'bg-white', category: 'shoes', description: "Handcrafted leather Chelsea boots.", stock: 5 },
  { id: 201, shopId: 'msupa', brand: 'BEIGE TRENCH', price: 12400, image: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=800&q=80', bgColor: 'bg-white', category: 'jackets', description: "A versatile trench coat.", stock: 8 },
  { id: 204, shopId: 'msupa', brand: 'TIGER PRINT SET', price: 4200, image: 'https://images.unsplash.com/photo-1621330396173-e41b1bac7177?auto=format&fit=crop&w=800&q=80', bgColor: 'bg-white', category: 'tops', description: "Bold leopard/tiger print bikini.", stock: 30 },
  { id: 205, shopId: 'msupa', brand: 'COASTAL GINGHAM', price: 4500, image: 'https://images.unsplash.com/photo-1534452285072-8bb1fe1c16f8?auto=format&fit=crop&w=800&q=80', bgColor: 'bg-white', category: 'tops', description: "Light blue gingham checkered bikini.", stock: 14 },
  { id: 207, shopId: 'msupa', brand: 'PLEATED TENNIS SKIRT', price: 2500, image: 'https://images.unsplash.com/photo-1582142407894-ec85f1260a4c?auto=format&fit=crop&w=800&q=80', bgColor: 'bg-white', category: 'trousers', description: "Classic pleated mini skirt.", stock: 50 },
];

const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mediaQueryList = window.matchMedia(query);
    const listener = (event: MediaQueryListEvent) => setMatches(event.matches);
    mediaQueryList.addEventListener('change', listener);
    return () => mediaQueryList.removeEventListener('change', listener);
  }, [query]);
  return matches;
};

const urlToFile = (url: string, filename: string): Promise<File> => {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.setAttribute('crossOrigin', 'anonymous');
        image.src = url;
        image.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = image.naturalWidth;
            canvas.height = image.naturalHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) return reject(new Error('Canvas context failed'));
            ctx.drawImage(image, 0, 0);
            canvas.toBlob((blob) => {
                if (!blob) return reject(new Error('Blob creation failed'));
                resolve(new File([blob], filename, { type: blob.type }));
            });
        };
        image.onerror = (err) => reject(new Error("Failed to load image."));
    });
};

type ActiveModal = 'wardrobe' | 'vibe' | 'profile' | 'admin' | 'storage' | null;
type ViewState = 'home' | 'try-on';

const App: React.FC = () => {
  useScreenProtection();

  const [currentView, setCurrentView] = useState<ViewState>('home');
  const [currentShop, setCurrentShop] = useState<string>('all');
  const [allProducts, setAllProducts] = useState<ShopProduct[]>(INITIAL_PRODUCTS);

  const [userAvatar, setUserAvatar] = useState<AvatarAssets | null>(null);
  const [modelImageUrl, setModelImageUrl] = useState<string | null>(null);

  const [outfitHistory, setOutfitHistory] = useState<OutfitLayer[]>([]);
  const [previewLayer, setPreviewLayer] = useState<OutfitLayer | null>(null);
  
  const [activeProduct, setActiveProduct] = useState<any | null>(null);
  const [likedItems, setLikedItems] = useState<Set<number>>(new Set());

  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [currentPoseIndex, setCurrentPoseIndex] = useState(0);
  const [pendingPoseIndex, setPendingPoseIndex] = useState<number | null>(null);
  const [poseErrorIndex, setPoseErrorIndex] = useState<number | null>(null);
  const [pendingGarmentIds, setPendingGarmentIds] = useState<string[]>([]);
  const [wardrobe, setWardrobe] = useState<WardrobeItem[]>(defaultWardrobe);
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [savedLooks, setSavedLooks] = useState<SavedLook[]>([]);
  
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | undefined>(undefined);

  const [isSavingLook, setIsSavingLook] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const isMobile = useMediaQuery('(max-width: 767px)');

  const handleLogin = (profile?: UserProfile) => {
    setIsAuthenticated(true);
    if (profile) setUserProfile(profile);
  };

  const activeGarmentIds = useMemo(() => {
    const ids: string[] = [];
    outfitHistory.forEach(layer => {
        if (layer.garment) ids.push(layer.garment.id);
        if (layer.garments) layer.garments.forEach(g => ids.push(g.id));
    });
    if (previewLayer) {
        if (previewLayer.garment) ids.push(previewLayer.garment.id);
        if (previewLayer.garments) previewLayer.garments.forEach(g => ids.push(g.id));
    }
    return [...new Set(ids)];
  }, [outfitHistory, previewLayer]);
  
  const displayImageUrl = useMemo(() => {
    if (previewLayer) {
        const poseInstruction = POSE_INSTRUCTIONS[currentPoseIndex];
        return previewLayer.poseImages[poseInstruction] ?? Object.values(previewLayer.poseImages)[0];
    }
    if (outfitHistory.length > 0) {
        const currentLayer = outfitHistory[outfitHistory.length - 1];
        const poseInstruction = POSE_INSTRUCTIONS[currentPoseIndex];
        return currentLayer.poseImages[poseInstruction] ?? Object.values(currentLayer.poseImages)[0];
    }
    return modelImageUrl;
  }, [outfitHistory, previewLayer, currentPoseIndex, modelImageUrl]);

  const availablePoseKeys = useMemo(() => {
    const targetLayer = previewLayer || (outfitHistory.length > 0 ? outfitHistory[outfitHistory.length - 1] : null);
    return targetLayer ? Object.keys(targetLayer.poseImages) : [];
  }, [outfitHistory, previewLayer]);

  const handleModelFinalized = (assets: AvatarAssets) => {
    setModelImageUrl(assets.full);
    setUserAvatar(assets);
    setOutfitHistory([{
      garment: null,
      garments: [],
      poseImages: { [POSE_INSTRUCTIONS[0]]: assets.full }
    }]);
    setPreviewLayer(null);
  };

  const handleAvatarUpload = async (file: File) => {
    setIsLoading(true);
    setLoadingMessage("Creating your avatar (Full & Close-Up)...");
    try {
        const assets = await generateAvatarAssets(file);
        setUserAvatar(assets);
        if (currentView === 'try-on') handleModelFinalized(assets);
    } catch (err) {
        setError(getFriendlyErrorMessage(err, "Failed to update avatar"));
    } finally {
        setIsLoading(false);
        setLoadingMessage("");
    }
  };

  const handleStartOver = () => {
    setModelImageUrl(null);
    setOutfitHistory([]);
    setPreviewLayer(null);
    setIsLoading(false);
    setLoadingMessage('');
    setError(null);
    setCurrentPoseIndex(0);
    setActiveModal(null);
    setActiveProduct(null);
  };

  const handleToggleLike = useCallback((product: any) => {
    const productId = product.id;
    setLikedItems(prevLiked => {
        const nextLiked = new Set(prevLiked);
        const isLiked = nextLiked.has(productId);
        if (isLiked) {
            nextLiked.delete(productId);
            setWardrobe(prev => prev.filter(item => item.id !== productId.toString()));
        } else {
            nextLiked.add(productId);
            let category: WardrobeCategory = 'tops';
            const lowerCat = (product.category || '').toLowerCase();
            if (['shoes', 'footwear'].includes(lowerCat)) category = 'footwear';
            else if (['jeans', 'trousers', 'bottoms'].includes(lowerCat)) category = 'bottoms';
            else if (['caps', 'accessories', 'bags'].includes(lowerCat)) category = 'accessories';

            const newItem: WardrobeItem = {
                id: productId.toString(),
                name: product.brand,
                url: product.image,
                category: category
            };
            setWardrobe(prev => [newItem, ...prev]);
        }
        return nextLiked;
    });
  }, []);

  const handleGarmentSelect = useCallback(async (items: { file: File, info: WardrobeItem }[]) => {
    if (!displayImageUrl || isLoading || pendingGarmentIds.length > 0) return;
    
    // Close modal immediately so user sees the "Applying outfit" spinner on canvas
    setActiveModal(null);
    
    setIsLoading(true);
    setLoadingMessage("Applying outfit...");
    try {
        const lastSavedLayer = outfitHistory[outfitHistory.length - 1];
        // Ensure the base image is narrowed or cast properly if inferred from useMemo branches
        const currentBaseImage = lastSavedLayer 
            ? (lastSavedLayer.poseImages[POSE_INSTRUCTIONS[currentPoseIndex]] || (Object.values(lastSavedLayer.poseImages) as string[])[0])
            : modelImageUrl!;
        
        if (!currentBaseImage) throw new Error("Base image unavailable");

        const newImageUrl = await generateVirtualTryOnImage(currentBaseImage, items);
        const newLayer: OutfitLayer = {
            garment: items[0].info, 
            garments: items.map(i => i.info),
            poseImages: { [POSE_INSTRUCTIONS[currentPoseIndex]]: newImageUrl }
        };
        setPreviewLayer(newLayer);
    } catch (err) {
      setError(getFriendlyErrorMessage(err, 'Failed to apply outfit'));
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [displayImageUrl, isLoading, pendingGarmentIds, currentPoseIndex, outfitHistory, modelImageUrl]);

  useEffect(() => {
    const triggerAutoTryOn = async () => {
        if (currentView === 'try-on' && activeProduct && modelImageUrl && !isLoading) {
            try {
                setIsLoading(true);
                setLoadingMessage(`Preparing ${activeProduct.brand}...`);
                const file = await urlToFile(activeProduct.image, `prod-${activeProduct.id}.png`);
                let category: WardrobeCategory = 'tops';
                const lowerCat = activeProduct.category.toLowerCase();
                if (['shoes', 'footwear'].includes(lowerCat)) category = 'footwear';
                else if (['jeans', 'trousers', 'bottoms'].includes(lowerCat)) category = 'bottoms';
                const wardrobeItem: WardrobeItem = { id: activeProduct.id.toString(), name: activeProduct.brand, url: activeProduct.image, category: category };
                await handleGarmentSelect([{ file, info: wardrobeItem }]);
                setActiveProduct(null); 
            } catch (err) {
                setError("Failed to load selected product for try-on.");
                setIsLoading(false);
            }
        }
    };
    triggerAutoTryOn();
  }, [currentView, activeProduct, modelImageUrl, isLoading, handleGarmentSelect]);

  const handleSaveLook = async () => {
      const targetLayer = previewLayer || outfitHistory[outfitHistory.length - 1];
      if (!targetLayer || !displayImageUrl || isSavingLook) return;
      setIsSavingLook(true);
      try {
        const newSavedLook: SavedLook = {
            id: `look-${Date.now()}`,
            imageUrl: displayImageUrl as string,
            timestamp: Date.now(),
            // Casting previewLayer as OutfitLayer to resolve type mismatch in array spread when previewLayer is narrowed by ternary
            layers: previewLayer ? [...outfitHistory, previewLayer as OutfitLayer] : outfitHistory
        };
        setSavedLooks(prev => [newSavedLook, ...prev]);
        if (previewLayer) {
            setOutfitHistory(prev => [...prev, previewLayer as OutfitLayer]);
            setPreviewLayer(null);
        }
        const watermarkedBlob = await addWatermark(displayImageUrl as string);
        const blobUrl = URL.createObjectURL(watermarkedBlob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `boutique-pro-${Date.now()}.png`;
        link.click();
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
      } catch (err) {
        setError("Failed to save look.");
      } finally {
        setIsSavingLook(false);
      }
  };

  const handlePoseSelect = useCallback(async (newIndex: number) => {
    const targetLayer = previewLayer || outfitHistory[outfitHistory.length - 1];
    if (!targetLayer || isLoading || newIndex === currentPoseIndex) return;
    const poseInstruction = POSE_INSTRUCTIONS[newIndex];
    if (targetLayer.poseImages[poseInstruction]) {
      setCurrentPoseIndex(newIndex);
      return;
    }
    setIsLoading(true);
    setLoadingMessage(`Changing pose...`);
    try {
      // Fix: Cast Object.values to string[] to resolve 'unknown' type error on line 317
      const baseImages = Object.values(targetLayer.poseImages) as string[];
      const baseImage = baseImages[0];
      if (!baseImage) throw new Error("Source image for pose change not found");
      
      const newImageUrl = await generatePoseVariation(baseImage, poseInstruction);
      const updatedLayer = { ...targetLayer, poseImages: { ...targetLayer.poseImages, [poseInstruction]: newImageUrl } };
      if (previewLayer) setPreviewLayer(updatedLayer);
      else setOutfitHistory(prev => { const h = [...prev]; h[h.length - 1] = updatedLayer; return h; });
      setCurrentPoseIndex(newIndex);
    } catch (err) {
      setPoseErrorIndex(newIndex);
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [currentPoseIndex, outfitHistory, previewLayer, isLoading]);

  const handleUpdateProduct = (updatedProduct: ShopProduct) => {
    setAllProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
  };
  
  const handleDeleteProduct = (productId: number) => {
    setAllProducts(prev => prev.filter(p => p.id !== productId));
  };

  const storageButton = (
    <button 
        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-full hover:bg-emerald-100 transition-all text-[10px] font-bold uppercase tracking-widest shadow-sm active:scale-95 ml-12"
        onClick={() => setActiveModal('storage')}
        title="Manage Storage"
    >
        <UploadCloudIcon className="w-3 h-3" />
        Storage
    </button>
  );

  return (
    <div className="font-sans">
      <Navbar onOpenProfile={() => setActiveModal('profile')} currentShop={currentShop} onSelectShop={setCurrentShop} />

      <AnimatePresence mode="wait">
        {currentView === 'home' ? (
             <motion.div key="home" className="w-full h-[100dvh] pt-14" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <ShopHome currentShop={currentShop} allProducts={allProducts} initialProduct={activeProduct} onViewProduct={setActiveProduct} onProductClick={(p) => { setActiveProduct(p); setCurrentView('try-on'); }} likedItems={likedItems} onToggleLike={handleToggleLike} />
             </motion.div>
        ) : (
            !modelImageUrl ? (
                <motion.div key="start-screen" className="w-full h-[100dvh] flex items-start justify-center bg-gray-50 p-4 pb-20 overflow-y-auto pt-16" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <StartScreen onModelFinalized={handleModelFinalized} onBack={() => setCurrentView('home')} savedAvatar={userAvatar} />
                </motion.div>
            ) : (
                <motion.div key="main-app" className="relative flex flex-col h-[100dvh] bg-white overflow-hidden pt-14" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <main className="flex-grow relative flex flex-col overflow-hidden">
                    <div className="w-full h-full flex flex-col items-center justify-center bg-white sm:pb-16 pb-0 relative">
                        <Canvas displayImageUrl={displayImageUrl} onStartOver={handleStartOver} isLoading={isLoading} loadingMessage={loadingMessage} onSelectPose={handlePoseSelect} poseInstructions={POSE_INSTRUCTIONS} currentPoseIndex={currentPoseIndex} pendingPoseIndex={pendingPoseIndex} poseErrorIndex={poseErrorIndex} availablePoseKeys={availablePoseKeys} onOpenWardrobe={() => setActiveModal('wardrobe')} onOpenVibeCheck={() => setActiveModal('vibe')} onSaveLook={handleSaveLook} showSaveButton={!!previewLayer || (outfitHistory.length > 0)} isSaving={isSavingLook} isSaved={saveSuccess} onBack={() => setCurrentView('home')} />
                    </div>
                    </main>
                    <Modal isOpen={activeModal === 'wardrobe'} onClose={() => setActiveModal(null)} title="Wardrobe"><WardrobePanel onGarmentSelect={handleGarmentSelect} activeGarmentIds={activeGarmentIds} isLoading={isLoading} wardrobe={wardrobe} pendingGarmentIds={pendingGarmentIds} /></Modal>
                    <Modal isOpen={activeModal === 'vibe'} onClose={() => setActiveModal(null)} title="Vibe Check Gallery"><VibeCheckGallery savedLooks={savedLooks} /></Modal>
                </motion.div>
            )
        )}
      </AnimatePresence>

      <Modal isOpen={activeModal === 'profile'} onClose={() => setActiveModal(null)} title={isAuthenticated ? "Profile" : "Sign In"}>
        <ProfilePanel savedLooksCount={savedLooks.length} wardrobeCount={wardrobe.length} onOpenVibeCheck={() => setActiveModal('vibe')} onOpenWardrobe={() => setActiveModal('wardrobe')} onOpenAdmin={() => setActiveModal('admin')} isAuthenticated={isAuthenticated} onLogin={handleLogin} onLogout={() => setIsAuthenticated(false)} currentAvatarUrl={userAvatar?.full} onUpdateAvatar={handleAvatarUpload} isProcessingAvatar={isLoading && loadingMessage.includes("avatar")} userProfile={userProfile} />
      </Modal>

      <Modal isOpen={activeModal === 'admin'} onClose={() => setActiveModal('profile')} title="Inventory Manager" headerContent={storageButton}>
          <AdminDashboard 
            allProducts={allProducts}
            onAddProduct={(p) => setAllProducts(prev => [p, ...prev])} 
            onUpdateProduct={handleUpdateProduct}
            onDeleteProduct={handleDeleteProduct}
            onClose={() => setActiveModal('profile')} 
          />
      </Modal>

      <Modal isOpen={activeModal === 'storage'} onClose={() => setActiveModal(null)} title="Storage Manager">
          <SupabaseStorageManager onClose={() => setActiveModal(null)} />
      </Modal>

      {/* Global Error Toast */}
      <AnimatePresence>
        {error && (
            <motion.div 
                initial={{ opacity: 0, y: 50, scale: 0.9 }} 
                animate={{ opacity: 1, y: 0, scale: 1 }} 
                exit={{ opacity: 0, y: 50, scale: 0.9 }}
                className="fixed bottom-24 left-4 right-4 sm:left-1/2 sm:-translate-x-1/2 sm:max-w-md z-[60] bg-red-600 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center justify-between"
            >
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{error}</span>
                </div>
                <button 
                    onClick={() => setError(null)} 
                    className="p-1 hover:bg-white/20 rounded-full transition-colors ml-3"
                >
                    <XIcon className="w-5 h-5 text-white" />
                </button>
            </motion.div>
        )}
      </AnimatePresence>

      <Footer isOnDressingScreen={currentView === 'try-on' && !!modelImageUrl} onHome={() => setCurrentView('home')} onTryOn={() => currentView === 'home' ? setCurrentView('try-on') : document.getElementById('image-upload-start')?.click()} />
    </div>
  );
};

export default App;
