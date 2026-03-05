
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SparklesIcon, UploadCloudIcon, CheckCircleIcon, XIcon, PlusIcon, PencilIcon, DownloadIcon, Trash2Icon, RotateCcwIcon } from './icons';
import { GoogleGenAI, Modality, Type } from "@google/genai";
import Spinner from './Spinner';
import { ShopProduct } from '../types';
import { supabase } from '@/lib/supabase';

interface AdminDashboardProps {
  allProducts: ShopProduct[];
  onAddProduct: (product: ShopProduct) => void;
  onUpdateProduct: (product: ShopProduct) => void;
  onDeleteProduct: (productId: number) => void;
  onClose: () => void;
}

const SHOPS = [
    { id: 'all', name: 'Boutique Pro' },
    { id: 'vazi', name: 'Vazi' },
    { id: 'msupa', name: 'Msupa' },
];

const CATEGORIES = ['tops', 'jeans', 'jackets', 'trousers', 'shoes', 'caps'];

interface StorageFileItem {
    name: string;
    url: string;
    isImported: boolean;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ allProducts, onAddProduct, onUpdateProduct, onDeleteProduct, onClose }) => {
    const [view, setView] = useState<'add' | 'manage' | 'edit'>('add');
    const [targetShop, setTargetShop] = useState('all');
    
    // Add/Edit Product State
    const [editingId, setEditingId] = useState<number | null>(null);
    const [brand, setBrand] = useState('');
    const [price, setPrice] = useState('');
    const [category, setCategory] = useState('tops');
    const [description, setDescription] = useState('');
    const [stock, setStock] = useState('10');
    
    const [imagePreview, setImagePreview] = useState<string | null>(null); // The Main Product Image (Clean)
    const [originalImage, setOriginalImage] = useState<string | null>(null); // The Source Image (Model)

    const [isGenerating, setIsGenerating] = useState(false);
    const [aiPrompt, setAiPrompt] = useState('');
    const [error, setError] = useState<string | null>(null);

    // Import State
    const [isImporting, setIsImporting] = useState(false);
    const [importStatus, setImportStatus] = useState('');
    
    // Storage Picker State
    const [showStoragePicker, setShowStoragePicker] = useState(false);
    const [storageFiles, setStorageFiles] = useState<StorageFileItem[]>([]);
    const [selectedStorageUrls, setSelectedStorageUrls] = useState<Set<string>>(new Set());
    const [pickerMode, setPickerMode] = useState<'batch' | 'single'>('batch');

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                const result = ev.target?.result as string;
                setImagePreview(result);
                setOriginalImage(result); // Set as original too
            };
            reader.readAsDataURL(file);
        }
    };

    // Helper to get Base64 data from a URL (handles Storage and Blobs)
    const getImageData = async (url: string): Promise<string> => {
        // 1. If it's a data URL, return it directly
        if (url.startsWith('data:')) {
            return url.split(',')[1];
        }

        // 2. If it's a local blob (from file upload)
        if (url.startsWith('blob:')) {
             const response = await fetch(url);
             const blob = await response.blob();
             return new Promise((resolve) => {
                 const reader = new FileReader();
                 reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
                 reader.readAsDataURL(blob);
             });
        }

        // 3. If it's a Supabase URL
        if (url.includes('supabase.co')) {
            try {
                const response = await fetch(url);
                const blob = await response.blob();
                return new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
                    reader.readAsDataURL(blob);
                });
            } catch (err) {
                console.error("Failed to fetch image from Supabase:", err);
            }
        }
        
        // 4. Fallback fetch
        const response = await fetch(url);
        const blob = await response.blob();
        return new Promise((resolve) => {
             const reader = new FileReader();
             reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
             reader.readAsDataURL(blob);
         });
    };

    const handleAiGenerate = async () => {
        if (!originalImage) {
            setError("Please upload or select an image first.");
            return;
        }

        setIsGenerating(true);
        setError(null);
        
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
            
            // Get the base64 data of the ORIGINAL image
            const base64Data = await getImageData(originalImage);

            const prompt = `Generate a professional product image of the ${aiPrompt || category} shown in this picture.
            
            **CRITICAL EXTRACTION RULES:**
            1. **Multi-Item Sets:** If the image contains a matching set (e.g., a bikini top AND bottom, a tracksuit top AND pants, or a top AND skirt), you MUST extract ALL pieces. Do not extract just one item.
            2. **Accessories:** If there are matching accessories clearly part of the outfit (e.g., a cap matching the shirt), extract them as well.
            3. **Arrangement:** Arrange the items in a clean, professional "flat lay" or "ghost mannequin" style on a pure white background.
            4. **Clean Up:** Exclude the model's body, skin, and original background. Only the clothing items should remain.
            
            The result should be a high-quality e-commerce asset showing the complete outfit set.`;

            // Using gemini-2.5-flash-image to avoid 403 Permission Denied errors with Pro models
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: [{ 
                    parts: [
                        { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
                        { text: prompt }
                    ] 
                }],
                config: { 
                    responseModalities: [Modality.IMAGE],
                    imageConfig: {
                        aspectRatio: "1:1"
                        // imageSize is NOT supported in gemini-2.5-flash-image
                    }
                },
            });

            const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
            
            if (imagePart?.inlineData) {
                const generatedBase64 = imagePart.inlineData.data;
                const generatedMimeType = imagePart.inlineData.mimeType;

                // --- SUPABASE PERSISTENCE LOGIC ---
                // Attempt to upload the generated result to Supabase so we have a permanent URL
                try {
                    const bucketName = import.meta.env.VITE_STORAGE_BUCKET || 'assets';
                    
                    // Decode Base64 to Uint8Array for Upload
                    const binaryString = atob(generatedBase64);
                    const bytes = new Uint8Array(binaryString.length);
                    for (let i = 0; i < binaryString.length; i++) {
                        bytes[i] = binaryString.charCodeAt(i);
                    }

                    const fileName = `extracted-product-${Date.now()}.png`; 
                    
                    // Upload
                    const { data, error: uploadError } = await supabase
                        .storage
                        .from(bucketName)
                        .upload(fileName, bytes, {
                            contentType: generatedMimeType
                        });

                    if (uploadError) throw uploadError;

                    // Get Public URL
                    const { data: { publicUrl } } = supabase
                        .storage
                        .from(bucketName)
                        .getPublicUrl(fileName);

                    setImagePreview(publicUrl);
                    console.log("Extracted image persisted to Supabase:", publicUrl);
                } catch (uploadErr) {
                    console.error("Failed to upload extracted image to Supabase:", uploadErr);
                    // Fallback to Base64 on upload failure
                    setImagePreview(`data:${generatedMimeType};base64,${generatedBase64}`);
                }
            } else {
                // Check for refusal/error
                const textPart = response.candidates?.[0]?.content?.parts?.find(p => p.text);
                const finishReason = response.candidates?.[0]?.finishReason;
                
                if (textPart?.text) {
                    console.warn("AI Refusal:", textPart.text);
                    throw new Error(textPart.text);
                }
                if (finishReason) {
                     throw new Error(`Generation blocked (${finishReason}). The image might violate safety policies.`);
                }
                throw new Error("No image generated.");
            }
        } catch (err: any) {
            console.error(err);
            let msg = err.message || "Extraction failed.";
            if (msg.includes('403')) msg = "Permission denied. Please check your API key permissions.";
            setError(msg);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleRevertImage = () => {
        if (originalImage) {
            setImagePreview(originalImage);
        }
    };

    // Step 1: Connect and List Files (Opens Picker)
    const handleFetchStorageFiles = async (mode: 'batch' | 'single' = 'batch') => {
        setPickerMode(mode);
        setIsImporting(true);
        setImportStatus("Connecting to Supabase...");
        setError(null);
        setStorageFiles([]);
        setSelectedStorageUrls(new Set());

        try {
            const bucketName = import.meta.env.VITE_STORAGE_BUCKET || 'assets';
            setImportStatus("Scanning bucket...");
            
            const { data, error: storageError } = await supabase
                .storage
                .from(bucketName)
                .list('', {
                    limit: 100,
                    offset: 0,
                    sortBy: { column: 'name', order: 'asc' },
                });

            if (storageError) throw storageError;

            const existingImages = new Set(allProducts.map(p => p.image));
            
            const files: StorageFileItem[] = (data || [])
                .filter(item => /\.(jpg|jpeg|png|webp)$/i.test(item.name))
                .map(item => {
                    const { data: { publicUrl } } = supabase
                        .storage
                        .from(bucketName)
                        .getPublicUrl(item.name);
                    return {
                        name: item.name,
                        url: publicUrl,
                        isImported: existingImages.has(publicUrl)
                    };
                })
                .sort((a, b) => (a.isImported === b.isImported) ? 0 : a.isImported ? 1 : -1); // Unimported first

            if (files.length === 0) {
                throw new Error("No images found in the bucket.");
            }

            setStorageFiles(files);
            setShowStoragePicker(true);

        } catch (err: any) {
             setError("Scan Failed: " + (err.message || "Unknown error"));
        } finally {
            setIsImporting(false);
            setImportStatus('');
        }
    };

    const toggleStorageSelection = (url: string) => {
        setSelectedStorageUrls(prev => {
            const next = new Set(prev);
            if (next.has(url)) {
                next.delete(url);
            } else {
                next.add(url);
            }
            return next;
        });
    };

    // Step 2: Process Selected Files (Analysis)
    const handleImportSelected = async () => {
        setShowStoragePicker(false);
        setIsImporting(true);
        setError(null);

        const itemsToImport = storageFiles.filter(f => selectedStorageUrls.has(f.url));
        if (itemsToImport.length === 0) {
            setIsImporting(false);
            return;
        }

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
            
            let importedCount = 0;
            for (const file of itemsToImport) {
                setImportStatus(`Analyzing (${importedCount + 1}/${itemsToImport.length})...`);
                
                try {
                    const response = await fetch(file.url);
                    const blob = await response.blob();
                    const base64Data = await new Promise<string>((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                            const res = (reader.result as string)?.split(',')[1];
                            resolve(res);
                        };
                        reader.onerror = reject;
                        reader.readAsDataURL(blob);
                    });

                    if (!base64Data) continue;

                    const prompt = `Analyze this fashion product image for an inventory system.
                    Return a strict JSON object with these fields:
                    - brand: A creative, short fictional brand name (uppercase).
                    - category: One of ['tops', 'jeans', 'jackets', 'trousers', 'shoes', 'caps'].
                    - description: A short, appealing product description (max 10 words).
                    - gender: 'mens' (if it looks like mens clothing) or 'womens' (if it looks like womens clothing).
                    
                    Respond ONLY with the JSON.`;

                    const result = await ai.models.generateContent({
                        model: 'gemini-3-flash-preview',
                        contents: {
                            parts: [
                                { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
                                { text: prompt }
                            ]
                        },
                        config: {
                            responseMimeType: 'application/json',
                            responseSchema: {
                                type: Type.OBJECT,
                                properties: {
                                    brand: { type: Type.STRING },
                                    category: { type: Type.STRING },
                                    description: { type: Type.STRING },
                                    gender: { type: Type.STRING, enum: ["mens", "womens"] }
                                }
                            }
                        }
                    });

                    let analysis;
                    try {
                        analysis = JSON.parse(result.text || '{}');
                    } catch (e) {
                         analysis = { brand: 'IMPORTED', category: 'tops', description: 'Imported item', gender: 'womens' };
                    }

                    // Store Assignment Logic
                    let finalShopId = targetShop;
                    if (finalShopId === 'all') {
                        finalShopId = analysis.gender === 'mens' ? 'vazi' : 'msupa';
                    }

                    const newProduct: ShopProduct = {
                        id: Date.now() + Math.random(),
                        shopId: finalShopId,
                        brand: analysis.brand || 'IMPORTED',
                        price: 0, 
                        image: file.url,
                        originalImage: file.url, // Store original
                        bgColor: 'bg-white',
                        category: (analysis.category || 'tops').toLowerCase(),
                        description: analysis.description || 'Newly imported item.',
                        stock: 1
                    };

                    onAddProduct(newProduct);
                    importedCount++;

                } catch (err) {
                    console.error(`Failed to analyze ${file.key}`, err);
                }
            }
            
            setImportStatus(`Success! Added ${importedCount} items.`);
            setTimeout(() => {
                setIsImporting(false);
                setView('manage'); 
            }, 1000);

        } catch (err: any) {
             setError("Import Failed: " + (err.message || "Unknown error"));
             setIsImporting(false);
        }
    };

    const handlePublish = () => {
        if (!brand || !price || !imagePreview) {
            setError("Required: Brand, Price, and Product Image.");
            return;
        }

        const newProduct: ShopProduct = {
            id: Date.now(),
            shopId: targetShop,
            brand: brand.toUpperCase(),
            price: parseInt(price),
            image: imagePreview,
            originalImage: originalImage || imagePreview,
            bgColor: 'bg-white',
            category: category,
            description: description,
            stock: parseInt(stock)
        };

        onAddProduct(newProduct);
        setView('manage');
        resetForm();
    };

    const startEditing = (product: ShopProduct) => {
        setBrand(product.brand);
        setPrice(product.price.toString());
        setCategory(product.category);
        setDescription(product.description);
        setStock(product.stock?.toString() || '10');
        setImagePreview(product.image);
        setOriginalImage(product.originalImage || product.image);
        setEditingId(product.id);
        setError(null);
        setView('edit');
    };

    const handleSaveEdit = () => {
         if (!brand || !price || !imagePreview || editingId === null) {
            setError("Required: Brand, Price, and Product Image.");
            return;
        }

        const updatedProduct: ShopProduct = {
            id: editingId,
            shopId: targetShop,
            brand: brand.toUpperCase(),
            price: parseInt(price),
            image: imagePreview,
            originalImage: originalImage || imagePreview,
            bgColor: 'bg-white',
            category: category,
            description: description,
            stock: parseInt(stock)
        };
        
        const original = allProducts.find(p => p.id === editingId);
        if (original && targetShop === 'all') {
            updatedProduct.shopId = original.shopId;
        }

        onUpdateProduct(updatedProduct);
        setView('manage');
        resetForm();
    };

    const handleDelete = () => {
        if (editingId !== null && confirm("Are you sure you want to delete this item?")) {
            onDeleteProduct(editingId);
            setView('manage');
            resetForm();
        }
    };

    const resetForm = () => {
        setBrand('');
        setPrice('');
        setDescription('');
        setImagePreview(null);
        setOriginalImage(null);
        setAiPrompt('');
        setError(null);
        setEditingId(null);
        setStock('10');
    };

    const shopProducts = allProducts.filter(p => targetShop === 'all' || p.shopId === targetShop);

    return (
        <div className="flex flex-col gap-6 font-sans relative">
            
            {/* View Switcher Tabs */}
            <div className="flex bg-gray-100 p-1 rounded-2xl border border-gray-200/50">
                <button 
                    onClick={() => { setView('add'); resetForm(); }}
                    className={`flex-1 py-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${view === 'add' ? 'bg-white text-gray-900 shadow-md ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <PlusIcon className="w-4 h-4" />
                    Add New
                </button>
                <button 
                    onClick={() => { setView('manage'); resetForm(); }}
                    className={`flex-1 py-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${view === 'manage' ? 'bg-white text-gray-900 shadow-md ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <PencilIcon className="w-4 h-4" />
                    Manage Stock
                </button>
            </div>

            {/* Shop Selector */}
            <div className="space-y-1.5">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] pl-1">Boutique Context</p>
                <div className="flex gap-2">
                    <div className="grid grid-cols-3 gap-2 flex-1">
                        {SHOPS.map(shop => (
                            <button 
                                key={shop.id}
                                onClick={() => setTargetShop(shop.id)}
                                className={`py-2 text-[10px] font-bold rounded-lg border transition-all ${targetShop === shop.id ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-500 border-gray-100 hover:border-gray-300'}`}
                            >
                                {shop.name}
                            </button>
                        ))}
                    </div>
                    <button 
                        className={`px-3 border rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm active:scale-95 whitespace-nowrap overflow-hidden
                            ${isImporting 
                                ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-wait w-32 justify-center' 
                                : 'bg-white text-emerald-600 border-emerald-100 hover:bg-emerald-50 hover:border-emerald-200'
                            }`}
                        onClick={() => handleFetchStorageFiles('batch')}
                        disabled={isImporting}
                    >
                        {isImporting ? (
                            <span className="animate-pulse">{importStatus ? "Scanning..." : "Importing..."}</span>
                        ) : (
                            <>
                                <DownloadIcon className="w-3.5 h-3.5" />
                                Import
                            </>
                        )}
                    </button>
                </div>
                {isImporting && !showStoragePicker && (
                    <p className="text-[10px] text-gray-500 font-medium pl-1 animate-pulse">{importStatus}</p>
                )}
            </div>

            {/* STORAGE SELECTION OVERLAY */}
            <AnimatePresence>
                {showStoragePicker && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="absolute inset-0 z-50 bg-white rounded-none sm:rounded-2xl flex flex-col"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-white z-10">
                             <div>
                                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                                    {pickerMode === 'single' ? 'Select Image' : 'Select Images'}
                                </h3>
                                <p className="text-[10px] text-gray-500">
                                    {pickerMode === 'single' ? 'Tap image to select' : `${selectedStorageUrls.size} selected`}
                                </p>
                             </div>
                             <button onClick={() => setShowStoragePicker(false)} className="p-2 text-gray-400 hover:text-gray-900">
                                <XIcon className="w-5 h-5" />
                             </button>
                        </div>
                        
                        {/* Grid */}
                        <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
                            <div className="grid grid-cols-3 gap-3">
                                {storageFiles.map((file) => {
                                    const isSelected = selectedStorageUrls.has(file.url);
                                    return (
                                        <button
                                            key={file.name}
                                            onClick={() => {
                                                if (pickerMode === 'single') {
                                                    // In single mode, selecting imports it to the form preview AND original
                                                    setImagePreview(file.url);
                                                    setOriginalImage(file.url);
                                                    setShowStoragePicker(false);
                                                } else {
                                                    !file.isImported && toggleStorageSelection(file.url);
                                                }
                                            }}
                                            disabled={file.isImported}
                                            className={`
                                                relative aspect-square rounded-xl overflow-hidden border-2 transition-all
                                                ${file.isImported 
                                                    ? 'border-transparent opacity-60 grayscale cursor-not-allowed' 
                                                    : isSelected 
                                                        ? 'border-emerald-500 ring-2 ring-emerald-100 shadow-md' 
                                                        : 'border-transparent hover:border-gray-300 bg-white shadow-sm'
                                                }
                                            `}
                                        >
                                            <img src={file.url} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                            
                                            {/* Status Badges */}
                                            {file.isImported && (
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                                                    <span className="bg-gray-800 text-white text-[8px] font-bold uppercase px-2 py-1 rounded-full">In Stock</span>
                                                </div>
                                            )}
                                            
                                            {isSelected && (
                                                <div className="absolute top-2 right-2">
                                                    <div className="bg-emerald-500 rounded-full p-0.5">
                                                        <CheckCircleIcon className="w-4 h-4 text-white" />
                                                    </div>
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Footer Action (Only for Batch Mode) */}
                        {pickerMode === 'batch' && (
                            <div className="p-4 border-t border-gray-100 bg-white">
                                <button
                                    onClick={handleImportSelected}
                                    disabled={selectedStorageUrls.size === 0}
                                    className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                >
                                    {selectedStorageUrls.size === 0 ? 'Select items to import' : `Analyze & Import (${selectedStorageUrls.size})`}
                                </button>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence mode="wait">
                {/* ADD VIEW OR EDIT VIEW */}
                {(view === 'add' || view === 'edit') ? (
                    <motion.div 
                        key="form-view"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-6"
                    >
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Brand Name</label>
                                <input type="text" value={brand} onChange={e => setBrand(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-100 bg-white text-sm outline-none focus:ring-2 focus:ring-gray-100" placeholder="e.g. LUXE BIKINI" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Price (Ksh)</label>
                                <input type="number" value={price} onChange={e => setPrice(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-100 bg-white text-sm outline-none focus:ring-2 focus:ring-gray-100" placeholder="4200" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Category</label>
                                <select value={category} onChange={e => setCategory(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-100 bg-white text-sm outline-none appearance-none capitalize">
                                    {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Units Available</label>
                                <input type="number" value={stock} onChange={e => setStock(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-100 bg-white text-sm outline-none focus:ring-2 focus:ring-gray-100" />
                            </div>
                        </div>

                         <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Description</label>
                            <input type="text" value={description} onChange={e => setDescription(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-100 bg-white text-sm outline-none focus:ring-2 focus:ring-gray-100" placeholder="Short description..." />
                        </div>

                        <div className="space-y-2">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Visual Content</p>
                            <div className="grid grid-cols-2 gap-4">
                                {/* Left Side: Original Image Input */}
                                <div className="flex flex-col gap-2">
                                     <div className={`relative aspect-square rounded-2xl border-2 border-dashed flex items-center justify-center overflow-hidden transition-all ${originalImage ? 'border-gray-200 bg-white' : 'border-gray-200 bg-gray-50/50'}`}>
                                        {originalImage ? (
                                            <img src={originalImage} className="w-full h-full object-cover" />
                                        ) : (
                                            <p className="text-[9px] text-gray-400 font-medium px-4 text-center">No Source Image</p>
                                        )}
                                        
                                        {/* Overlay for Source */}
                                        <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors flex items-center justify-center group/source">
                                             <button 
                                                type="button"
                                                onClick={() => handleFetchStorageFiles('single')}
                                                className="opacity-0 group-hover/source:opacity-100 bg-white px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase shadow-sm transform scale-95 group-hover/source:scale-100 transition-all"
                                            >
                                                Change
                                            </button>
                                        </div>
                                     </div>
                                     
                                     {/* Input Buttons */}
                                     <div className="flex gap-2">
                                         <label className="flex-1 flex flex-col items-center justify-center py-2 bg-gray-50 border border-gray-100 rounded-xl hover:bg-gray-100 transition-all cursor-pointer">
                                            <span className="text-[9px] font-bold text-gray-500 uppercase">Upload</span>
                                            <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                                        </label>
                                        <button 
                                            type="button"
                                            onClick={() => handleFetchStorageFiles('single')}
                                            className="flex-1 py-2 bg-gray-50 border border-gray-100 rounded-xl hover:bg-gray-100 transition-all text-[9px] font-bold text-gray-500 uppercase"
                                        >
                                            Cloud
                                        </button>
                                     </div>
                                </div>

                                {/* Right Side: Generated Result */}
                                <div className="flex flex-col gap-2">
                                    <div className={`relative aspect-square rounded-2xl border-2 border-dashed flex items-center justify-center overflow-hidden transition-all ${imagePreview ? 'border-emerald-100 bg-emerald-50/10' : 'border-gray-200 bg-gray-50/50'}`}>
                                        {imagePreview ? (
                                            <img src={imagePreview} className="w-full h-full object-cover animate-fade-in" />
                                        ) : (
                                            <SparklesIcon className="w-8 h-8 text-gray-200" />
                                        )}
                                        
                                        {isGenerating && (
                                            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center">
                                                <Spinner />
                                                <p className="text-[9px] font-bold text-gray-500 mt-2">Extracting Item...</p>
                                            </div>
                                        )}

                                        {/* Revert Button if changed */}
                                        {imagePreview && originalImage && imagePreview !== originalImage && !isGenerating && (
                                             <button 
                                                onClick={handleRevertImage}
                                                className="absolute top-2 right-2 p-1.5 bg-white rounded-full shadow-sm text-gray-400 hover:text-gray-900 border border-gray-100"
                                                title="Revert to Original"
                                             >
                                                <RotateCcwIcon className="w-3 h-3" />
                                             </button>
                                        )}
                                    </div>
                                    
                                    {/* Generator Controls */}
                                    <div className="p-2.5 bg-gray-50 border border-gray-100 rounded-2xl space-y-2">
                                        <input 
                                            type="text" 
                                            value={aiPrompt} 
                                            onChange={e => setAiPrompt(e.target.value)} 
                                            placeholder="Item Description (Optional)..." 
                                            className="w-full bg-transparent border-none text-[10px] font-medium outline-none placeholder:text-gray-400" 
                                        />
                                        <button 
                                            onClick={handleAiGenerate} 
                                            disabled={isGenerating || !originalImage} 
                                            className="w-full py-2 bg-gray-900 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-gray-800 transition-all disabled:opacity-50 flex items-center justify-center gap-1"
                                        >
                                            <SparklesIcon className="w-3 h-3" />
                                            Extract Product
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {error && <p className="text-red-500 text-[10px] font-bold text-center bg-red-50 p-2 rounded-lg">{error}</p>}
                        
                        {view === 'edit' ? (
                            <div className="flex gap-3">
                                 <button onClick={handleDelete} className="flex-1 bg-red-50 text-red-600 border border-red-100 py-4 rounded-2xl font-black uppercase tracking-[0.2em] active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                                    <Trash2Icon className="w-4 h-4"/>
                                    Delete
                                </button>
                                <button onClick={handleSaveEdit} className="flex-[2] bg-gray-900 text-white py-4 rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl shadow-gray-900/20 active:scale-[0.98] transition-all">
                                    Save Changes
                                </button>
                            </div>
                        ) : (
                            <button onClick={handlePublish} className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl shadow-emerald-500/20 active:scale-[0.98] transition-all">
                                Publish to {SHOPS.find(s => s.id === targetShop)?.name}
                            </button>
                        )}
                    </motion.div>
                ) : (
                    <motion.div 
                        key="manage-list"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-4"
                    >
                        <div className="flex items-center justify-between px-1">
                            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest">Store Inventory ({shopProducts.length})</h3>
                            <button onClick={resetForm} className="text-[10px] font-bold text-blue-500 hover:underline">Refresh List</button>
                        </div>

                        <div className="max-h-[400px] overflow-y-auto pr-1 space-y-3 scrollbar-hide">
                            {shopProducts.length === 0 ? (
                                <div className="py-12 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                                    <p className="text-xs text-gray-400 font-medium">No inventory for this boutique yet.</p>
                                </div>
                            ) : (
                                shopProducts.map((product, idx) => {
                                    const isNew = product.price === 0;
                                    return (
                                        <div 
                                            key={product.id} 
                                            onClick={() => startEditing(product)}
                                            className={`flex items-center gap-4 p-3 rounded-2xl border shadow-sm group relative cursor-pointer hover:shadow-md transition-all ${isNew ? 'bg-orange-50/50 border-orange-200' : 'bg-white border-gray-100'}`}
                                        >
                                            {isNew && (
                                                <div className="absolute top-0 right-0 bg-orange-500 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-bl-lg rounded-tr-lg z-10">
                                                    New
                                                </div>
                                            )}
                                            
                                            <span className="text-[10px] font-bold text-gray-300 w-4 tracking-tighter">{(idx + 1).toString().padStart(2, '0')}</span>
                                            
                                            <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-gray-50 border border-gray-100 relative">
                                                <img src={product.image} className="w-full h-full object-cover" alt={product.brand} />
                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 flex items-center justify-center transition-colors">
                                                    <PencilIcon className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 drop-shadow-sm" />
                                                </div>
                                            </div>
                                            
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[10px] font-black text-gray-900 uppercase truncate tracking-wide group-hover:text-blue-600 transition-colors">{product.brand}</p>
                                                <p className="text-[9px] text-gray-400 font-medium capitalize">{product.shopId} Store • {product.category}</p>
                                                {isNew ? (
                                                    <p className="text-[10px] text-orange-600 font-bold mt-0.5 animate-pulse">Set Price!</p>
                                                ) : (
                                                    <p className="text-[10px] text-gray-400 font-medium mt-0.5">Ksh {product.price.toLocaleString()}</p>
                                                )}
                                            </div>

                                            <div className="flex flex-col gap-1 items-end" onClick={e => e.stopPropagation()}>
                                                <div className="flex items-center gap-2">
                                                    <p className="text-[9px] font-bold text-gray-400 uppercase">Stock</p>
                                                    <input 
                                                        type="number" 
                                                        defaultValue={product.stock || 0}
                                                        onBlur={(e) => onUpdateProduct({ ...product, stock: parseInt(e.target.value) })}
                                                        className="w-12 px-1.5 py-1 rounded border border-gray-200 bg-white text-[10px] font-bold text-center focus:ring-1 focus:ring-gray-300 outline-none"
                                                    />
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <p className="text-[9px] font-bold text-gray-400 uppercase">Price</p>
                                                    <input 
                                                        type="number" 
                                                        defaultValue={product.price === 0 ? '' : product.price}
                                                        placeholder="0"
                                                        onBlur={(e) => onUpdateProduct({ ...product, price: parseInt(e.target.value) || 0 })}
                                                        className={`w-12 px-1.5 py-1 rounded border text-[10px] font-bold text-center focus:ring-1 outline-none ${isNew ? 'border-orange-300 bg-white text-orange-600 focus:ring-orange-400' : 'border-gray-200 bg-white'}`}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AdminDashboard;
