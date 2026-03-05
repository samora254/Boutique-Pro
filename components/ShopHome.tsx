
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { SearchIcon, ArrowLeftIcon, SparklesIcon } from './icons';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { generateRecoloredProduct } from '../services/geminiService';
import Spinner from './Spinner';
import { ShopProduct } from '../types';

const HeartIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
);

const SIZES = {
  shoes: ['US 5', 'US 6', 'US 7', 'US 8', 'US 9', 'US 10', 'US 11'],
  tops: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  bottoms: ['Waist 28', 'Waist 30', 'Waist 32', 'Waist 34', 'Waist 36'],
  caps: ['One Size']
};

const PRODUCT_COLORS = [
    { name: 'Green', hex: '#15803d', tailwind: 'bg-green-700' },
    { name: 'Indigo', hex: '#312e81', tailwind: 'bg-indigo-900' },
    { name: 'Teal', hex: '#2dd4bf', tailwind: 'bg-teal-400' },
    { name: 'Orange', hex: '#fb923c', tailwind: 'bg-orange-400' },
];

const getSizeOptions = (category: string) => {
    if (category === 'shoes') return SIZES.shoes;
    if (category === 'caps') return SIZES.caps;
    if (['jeans', 'trousers'].includes(category)) return SIZES.bottoms;
    return SIZES.tops; 
}

const CATEGORIES = [
  { id: 'all', label: 'All', image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=100&h=100&fit=crop' },
  { id: 'shoes', label: 'Shoes', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=100&h=100&fit=crop' },
  { id: 'tops', label: 'Tops', image: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=100&h=100&fit=crop' },
  { id: 'jeans', label: 'Jeans', image: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=100&h=100&fit=crop' },
  { id: 'jackets', label: 'Jackets', image: 'https://images.unsplash.com/photo-1551028919-ac66e624ec06?w=100&h=100&fit=crop' },
  { id: 'trousers', label: 'Bottoms', image: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=100&h=100&fit=crop' },
  { id: 'caps', label: 'Caps', image: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=100&h=100&fit=crop' },
];

const CAROUSEL_SLIDES = [
  { id: 'winter', title: 'WINTER COLLECTION', subtitle: 'Shop collection & Get 50% off', gradient: 'from-[#93C5FD] to-[#DBEAFE]', buttonText: 'Shop Now', image1: 'https://images.unsplash.com/photo-1551107696-a4b0c5a0d9a2?auto=format&fit=crop&w=400&q=80', image2: 'https://images.unsplash.com/photo-1605518216938-7c31b7b14ad0?auto=format&fit=crop&w=400&q=80', textColor: 'text-white', subTextColor: 'text-blue-50', buttonStyle: 'bg-white text-blue-900', rotation1: '-15deg', rotation2: '15deg' },
  { id: 'summer', title: 'TEEN SUMMER', subtitle: 'New arrivals for hot days', gradient: 'from-[#FDBA74] to-[#FFEDD5]', buttonText: 'View Lookbook', image1: 'https://images.unsplash.com/photo-1591195853828-11db59a44f6b?auto=format&fit=crop&w=400&q=80', image2: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=400&q=80', textColor: 'text-white', subTextColor: 'text-orange-50', buttonStyle: 'bg-white text-orange-800', rotation1: '10deg', rotation2: '-10deg' },
  { id: 'christmas', title: 'CHRISTMAS SALE', subtitle: '50% Discount Sale', gradient: 'from-[#EF4444] to-[#FECACA]', buttonText: 'Grab Deal', image1: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=400&q=80', image2: 'https://images.unsplash.com/photo-1551107696-a4b0c5a0d9a2?auto=format&fit=crop&w=400&q=80', textColor: 'text-white', subTextColor: 'text-red-50', buttonStyle: 'bg-white text-red-900', rotation1: '-20deg', rotation2: '10deg' }
];

interface ShopHomeProps {
  onProductClick?: (product: ShopProduct) => void;
  initialProduct?: ShopProduct | null;
  onViewProduct?: (product: ShopProduct | null) => void;
  likedItems?: Set<number>;
  onToggleLike?: (product: ShopProduct) => void;
  currentShop?: string;
  allProducts: ShopProduct[];
}

const ShopHome: React.FC<ShopHomeProps> = ({ 
  onProductClick, 
  initialProduct, 
  onViewProduct,
  likedItems = new Set(),
  onToggleLike,
  currentShop = 'all',
  allProducts
}) => {
  const [view, setView] = useState<'feed' | 'collection'>('feed');
  const [selectedProduct, setSelectedProduct] = useState<ShopProduct | null>(initialProduct || null);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [isSizeDropdownOpen, setIsSizeDropdownOpen] = useState(false);
  const [[page, direction], setPage] = useState([0, 0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  
  const [colorCache, setColorCache] = useState<Record<string, string>>({});
  const [isRecoloring, setIsRecoloring] = useState(false);
  const [currentProductImage, setCurrentProductImage] = useState<string>('');

  const handleProductSelect = (product: ShopProduct | null) => {
    setSelectedProduct(product);
    if (product) setCurrentProductImage(product.image);
    if (onViewProduct) onViewProduct(product);
  };

  const handleColorSelect = async (colorHex: string, colorName: string) => {
    if (!selectedProduct || isRecoloring) return;
    const cacheKey = `${selectedProduct.id}-${colorHex}`;
    if (colorCache[cacheKey]) {
        setCurrentProductImage(colorCache[cacheKey]);
        return;
    }
    setIsRecoloring(true);
    try {
        const newImageUrl = await generateRecoloredProduct(selectedProduct.image, colorName, colorHex);
        setColorCache(prev => ({ ...prev, [cacheKey]: newImageUrl }));
        setCurrentProductImage(newImageUrl);
    } catch (err) {
        console.error("Failed to recolor", err);
    } finally {
        setIsRecoloring(false);
    }
  };

  useEffect(() => {
    if (selectedProduct) {
        const options = getSizeOptions(selectedProduct.category);
        setSelectedSize(options.includes('M') ? 'M' : options[0]);
        if (!currentProductImage) setCurrentProductImage(selectedProduct.image);
    }
  }, [selectedProduct]);

  const slideIndex = ((page % CAROUSEL_SLIDES.length) + CAROUSEL_SLIDES.length) % CAROUSEL_SLIDES.length;
  const currentSlideData = CAROUSEL_SLIDES[slideIndex];

  const filteredProducts = useMemo(() => {
    return allProducts.filter(product => {
        if (currentShop !== 'all' && product.shopId !== currentShop) return false;
        const lowerQuery = searchQuery.toLowerCase();
        const matchesSearch = product.brand.toLowerCase().includes(lowerQuery) || product.category.toLowerCase().includes(lowerQuery);
        const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory, currentShop, allProducts]);

  const searchRecommendations = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const lowerQuery = searchQuery.toLowerCase();
    const matchingBrands = allProducts.map(p => p.brand).filter(b => b.toLowerCase().includes(lowerQuery));
    return [...new Set(matchingBrands)].slice(0, 5);
  }, [searchQuery, allProducts]);

  const paginate = useCallback((newDirection: number) => {
    setPage([page + newDirection, newDirection]);
  }, [page]);

  useEffect(() => {
    if (view !== 'feed' || selectedProduct) return;
    const interval = setInterval(() => paginate(1), 4000);
    return () => clearInterval(interval);
  }, [view, paginate, selectedProduct]);

  if (selectedProduct) {
    const sizeOptions = getSizeOptions(selectedProduct.category);
    const isLiked = likedItems.has(selectedProduct.id);

    return (
        <motion.div key="detail" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 50 }} className="w-full h-full bg-white flex flex-col font-sans relative">
            <div className="flex items-center justify-between px-6 py-4 sticky top-0 bg-white/90 backdrop-blur-sm z-20">
                <button onClick={() => handleProductSelect(null)} className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-gray-900 border border-gray-100 shadow-sm hover:bg-gray-50 transition-all"><ArrowLeftIcon className="w-5 h-5" /></button>
                <div className="flex items-center gap-3">
                    <button onClick={() => onToggleLike && onToggleLike(selectedProduct)} className={`w-10 h-10 rounded-full flex items-center justify-center border shadow-sm transition-all ${isLiked ? 'bg-green-50 text-green-600 border-green-100' : 'bg-white text-gray-900 border-gray-100'}`}><HeartIcon className="w-5 h-5" fill={isLiked ? "currentColor" : "none"} /></button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto pb-32">
                <div className="w-[75%] mx-auto aspect-[3/4] rounded-2xl overflow-hidden shadow-lg bg-gray-50 relative mt-4">
                     <img src={currentProductImage || selectedProduct.image} className="w-full h-full object-cover transition-all" draggable={false} />
                     <AnimatePresence>{isRecoloring && <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center"><Spinner /></div>}</AnimatePresence>
                </div>

                <div className="px-6 space-y-4 mt-6">
                    <div className="flex items-start justify-between">
                        <div>
                            <h1 className="text-xl font-serif font-bold text-gray-900 uppercase tracking-tight">{selectedProduct.brand}</h1>
                            <p className="text-lg text-gray-900 font-medium">Ksh {selectedProduct.price.toLocaleString()}</p>
                            {selectedProduct.stock && <p className="text-[10px] text-emerald-500 font-bold uppercase mt-1">In Stock: {selectedProduct.stock}</p>}
                        </div>
                        <div className="flex flex-col items-end gap-3">
                             <div className="flex items-center gap-1.5">
                                {PRODUCT_COLORS.map(color => <button key={color.name} onClick={() => handleColorSelect(color.hex, color.name)} className={`w-4 h-4 rounded-full ${color.tailwind} ring-1 ring-gray-200 transition-transform hover:scale-110`} />)}
                            </div>
                            <button onClick={() => setIsSizeDropdownOpen(!isSizeDropdownOpen)} className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-full text-[10px] font-bold border border-gray-100 uppercase tracking-widest">{selectedSize || 'SIZE'}</button>
                        </div>
                    </div>
                    <p className="text-sm text-gray-500 leading-relaxed">{selectedProduct.description}</p>
                </div>
            </div>

            <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-6 pb-8 z-30">
                <div className="flex items-center gap-4">
                     <button className="flex-1 bg-emerald-500 text-white py-4 rounded-2xl font-bold uppercase tracking-widest shadow-xl shadow-emerald-500/20 active:scale-95">Buy Now</button>
                    <button onClick={() => onProductClick && onProductClick({ ...selectedProduct, image: currentProductImage })} className="flex-1 bg-blue-500 text-white py-4 rounded-2xl font-bold uppercase tracking-widest shadow-xl shadow-blue-500/20 active:scale-95">Try On</button>
                </div>
            </div>
        </motion.div>
    );
  }

  return (
    <motion.div key="feed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full h-full bg-white flex flex-col overflow-y-auto pb-24 font-sans">
      <div className="px-4 mb-4 mt-4 relative z-50">
        <div className="relative">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input type="text" placeholder="Search brands..." value={searchQuery} onFocus={() => setIsSearchFocused(true)} onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-gray-50 rounded-2xl py-4 pl-12 pr-4 outline-none focus:ring-2 focus:ring-gray-100 text-sm font-medium" />
        </div>
      </div>

      <div className="px-4 mb-8">
        <div className="w-full aspect-[2/1] relative overflow-hidden rounded-3xl bg-gray-100">
            <AnimatePresence initial={false} mode="popLayout">
                <motion.div key={page} initial={{ x: 300, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -300, opacity: 0 }} className={`absolute inset-0 w-full h-full bg-gradient-to-br ${currentSlideData.gradient} flex flex-col justify-center px-8`}>
                     <h2 className="text-3xl font-serif font-black italic tracking-wide text-white drop-shadow-sm">{currentSlideData.title}</h2>
                     <p className="text-xs text-white/90 font-medium mb-4">{currentSlideData.subtitle}</p>
                     <button onClick={() => setView('collection')} className={`${currentSlideData.buttonStyle} px-6 py-2.5 rounded-full text-[10px] font-bold uppercase tracking-widest self-start shadow-lg`}>{currentSlideData.buttonText}</button>
                </motion.div>
            </AnimatePresence>
        </div>
      </div>

      <div className="mb-8 overflow-x-auto flex px-4 gap-4 pb-2 scrollbar-hide">
        {CATEGORIES.map(cat => (
            <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} className={`flex-shrink-0 flex flex-col items-center gap-2 group`}>
                <div className={`w-14 h-14 rounded-2xl overflow-hidden border-2 transition-all ${selectedCategory === cat.id ? 'border-gray-900 scale-105' : 'border-transparent opacity-60'}`}>
                    <img src={cat.image} className="w-full h-full object-cover" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{cat.label}</span>
            </button>
        ))}
      </div>

      <div className="px-4">
        <h3 className="text-lg font-serif font-bold text-gray-900 mb-6 uppercase tracking-widest">Store Inventory</h3>
        <div className="grid grid-cols-2 gap-4">
            {filteredProducts.map(product => {
                const isLiked = likedItems.has(product.id);
                return (
                    <motion.div key={product.id} onClick={() => handleProductSelect(product)} className="flex flex-col gap-2 group cursor-pointer">
                        <div className="bg-gray-50 rounded-2xl overflow-hidden aspect-[4/5] relative shadow-sm border border-gray-100 transition-all group-hover:shadow-md">
                            <img src={product.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                            <button onClick={e => { e.stopPropagation(); onToggleLike && onToggleLike(product); }} className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all ${isLiked ? 'bg-green-50 text-green-600' : 'bg-white/80 text-gray-400 hover:text-green-600 hover:bg-white'}`}><HeartIcon className="w-4 h-4" fill={isLiked ? "currentColor" : "none"} /></button>
                        </div>
                        <div>
                            <h4 className="text-[10px] font-bold text-gray-900 uppercase tracking-widest truncate">{product.brand}</h4>
                            <p className="text-xs text-gray-400 font-medium">Ksh {product.price.toLocaleString()}</p>
                        </div>
                    </motion.div>
                );
            })}
        </div>
      </div>
    </motion.div>
  );
};

export default ShopHome;
