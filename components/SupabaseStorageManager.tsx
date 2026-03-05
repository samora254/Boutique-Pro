import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    UploadCloudIcon, 
    LockIcon, 
    ShieldCheckIcon, 
    DatabaseIcon, 
    CheckCircleIcon, 
    LinkIcon, 
    CopyIcon,
    XIcon,
    SparklesIcon,
    RotateCcwIcon
} from './icons';
import { supabase, updateSupabaseConfig } from '@/lib/supabase';

interface SupabaseStorageManagerProps {
    onClose: () => void;
}

type Step = 'connect' | 'upload';

interface UploadedFile {
    id: string;
    name: string;
    url: string;
    size: string;
    type: string;
    status: 'uploading' | 'success' | 'error';
    errorMessage?: string;
}

const SupabaseStorageManager: React.FC<SupabaseStorageManagerProps> = ({ onClose }) => {
    const [step, setStep] = useState<Step>('connect');
    
    const [supabaseUrl, setSupabaseUrl] = useState(import.meta.env.VITE_SUPABASE_URL || '');
    const [supabaseKey, setSupabaseKey] = useState(import.meta.env.VITE_SUPABASE_ANON_KEY || '');
    const [bucketName, setBucketName] = useState(import.meta.env.VITE_STORAGE_BUCKET || 'boutique-pro-assets');
    
    const [isLoading, setIsLoading] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
    const [isDragging, setIsDragging] = useState(false);

    const fetchBucketFiles = async () => {
        if (!bucketName) return;
        setIsRefreshing(true);
        try {
            const { data, error } = await supabase
                .storage
                .from(bucketName)
                .list('', {
                    limit: 100,
                    offset: 0,
                    sortBy: { column: 'created_at', order: 'desc' },
                });

            if (error) throw error;

            const files: UploadedFile[] = (data || []).map(item => {
                const isImage = /\.(jpg|jpeg|png|webp|gif|avif|bmp|svg)$/i.test(item.name);
                const { data: { publicUrl } } = supabase
                    .storage
                    .from(bucketName)
                    .getPublicUrl(item.name);

                return {
                    id: item.id,
                    name: item.name,
                    url: publicUrl,
                    size: ((item.metadata?.size || 0) / 1024).toFixed(1) + ' KB',
                    type: isImage ? 'image/jpeg' : 'application/octet-stream',
                    status: 'success'
                };
            });
            setUploadedFiles(files);
        } catch (err: any) {
            console.warn("Failed to fetch bucket contents:", err);
        } finally {
            setIsRefreshing(false);
        }
    };

    const handleConnect = async () => {
        if (!supabaseUrl || !supabaseKey || !bucketName) {
            setError("Please ensure Supabase URL, Key, and Bucket Name are provided.");
            return;
        }
        
        setIsLoading(true);
        setError(null);

        try {
            // Update the global client with the provided credentials
            updateSupabaseConfig(supabaseUrl, supabaseKey);

            // Check if bucket exists, if not try to create it (might fail if not admin)
            const { data: buckets, error: getBucketsError } = await supabase.storage.listBuckets();
            
            if (getBucketsError) throw getBucketsError;

            const bucketExists = buckets?.some(b => b.name === bucketName);
            
            if (!bucketExists) {
                const { error: createError } = await supabase.storage.createBucket(bucketName, {
                    public: true,
                    fileSizeLimit: 5242880, // 5MB
                });
                if (createError) {
                    console.warn("Bucket creation failed (likely permissions):", createError);
                    setError("Bucket not found and could not be created. Please create it manually in Supabase dashboard.");
                    setIsLoading(false);
                    return;
                }
            }

            await fetchBucketFiles();
            setStep('upload');
        } catch (err: any) {
            console.error("Supabase Connection Error:", err);
            setError(err.message || "Failed to connect to Supabase Storage.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileUpload = async (files: FileList | null) => {
        if (!files || files.length === 0) return;

        Array.from(files).forEach(async (file) => {
            const fileName = `${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
            const fileId = Math.random().toString(36).substring(7);

            setUploadedFiles(prev => [{
                id: fileId,
                name: file.name,
                url: '', 
                size: (file.size / 1024).toFixed(1) + ' KB',
                type: file.type,
                status: 'uploading'
            }, ...prev]);

            try {
                const { data, error: uploadError } = await supabase
                    .storage
                    .from(bucketName)
                    .upload(fileName, file);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase
                    .storage
                    .from(bucketName)
                    .getPublicUrl(fileName);
                
                setUploadedFiles(prev => prev.map(f => 
                    f.id === fileId ? { ...f, status: 'success', url: publicUrl, name: fileName } : f
                ));

            } catch (err: any) {
                console.error("Upload Error:", err);
                setUploadedFiles(prev => prev.map(f => 
                    f.id === fileId ? { 
                        ...f, 
                        status: 'error', 
                        errorMessage: err.message || "Upload failed"
                    } : f
                ));
            }
        });
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        alert("Copied to clipboard!");
    };

    return (
        <div className="flex flex-col h-full bg-white relative">
            {/* Header / Nav */}
            <div className="bg-emerald-50 border-b border-emerald-100 p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
                        <DatabaseIcon className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Supabase Storage</h2>
                        <p className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
                            <ShieldCheckIcon className="w-3 h-3" />
                            {step === 'upload' ? 'Active' : 'Setup'}
                        </p>
                    </div>
                </div>
                <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-900">
                    <XIcon className="w-5 h-5" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 relative">
                <AnimatePresence mode="wait">
                    {/* STEP 1: CONNECT */}
                    {step === 'connect' && (
                        <motion.div 
                            key="connect"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="max-w-sm mx-auto space-y-6 pt-4"
                        >
                            <div className="text-center space-y-2">
                                <h3 className="text-lg font-serif font-bold text-gray-900">Connect Supabase</h3>
                                <p className="text-xs text-gray-500 leading-relaxed">
                                    Use your Supabase project credentials to manage assets.
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Supabase URL</label>
                                    <input 
                                        type="text" 
                                        value={supabaseUrl}
                                        onChange={e => setSupabaseUrl(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                                        placeholder="https://your-project.supabase.co"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Anon Key</label>
                                    <input 
                                        type="password" 
                                        value={supabaseKey}
                                        onChange={e => setSupabaseKey(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                                        placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Bucket Name</label>
                                    <input 
                                        type="text" 
                                        value={bucketName}
                                        onChange={e => setBucketName(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm outline-none"
                                        placeholder="assets"
                                    />
                                </div>
                            </div>

                            {error && (
                                <p className="text-red-500 text-xs bg-red-50 p-2 rounded border border-red-100 text-center">
                                    {error}
                                </p>
                            )}

                            <button 
                                onClick={handleConnect}
                                disabled={isLoading || !supabaseUrl || !supabaseKey}
                                className="w-full bg-gray-900 text-white py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                            >
                                {isLoading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        Connecting...
                                    </>
                                ) : (
                                    <>
                                        <UploadCloudIcon className="w-4 h-4" />
                                        Initialize Supabase Storage
                                    </>
                                )}
                            </button>
                        </motion.div>
                    )}

                    {/* STEP 2: UPLOAD MANAGER */}
                    {step === 'upload' && (
                        <motion.div 
                            key="upload"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="space-y-6"
                        >
                            {/* Drag Drop Zone */}
                            <label 
                                className={`
                                    relative border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all
                                    ${isDragging ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 bg-gray-50 hover:bg-gray-100'}
                                `}
                                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                onDragLeave={() => setIsDragging(false)}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    setIsDragging(false);
                                    handleFileUpload(e.dataTransfer.files);
                                }}
                            >
                                <div className="w-16 h-16 rounded-full bg-white shadow-sm flex items-center justify-center text-emerald-500">
                                    <UploadCloudIcon className="w-8 h-8" />
                                </div>
                                <div className="text-center">
                                    <h4 className="font-serif font-bold text-gray-900 text-lg">Upload Images</h4>
                                    <p className="text-xs text-gray-500 mt-1">Drag & drop or click to browse</p>
                                </div>
                                <input 
                                    type="file" 
                                    multiple 
                                    className="hidden" 
                                    accept="image/*"
                                    onChange={(e) => handleFileUpload(e.target.files)}
                                />
                            </label>

                            {/* File List */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest flex items-center gap-2">
                                        Uploaded Assets ({uploadedFiles.length})
                                    </h3>
                                    <button 
                                        onClick={fetchBucketFiles}
                                        disabled={isRefreshing}
                                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors disabled:opacity-50"
                                        title="Refresh List"
                                    >
                                        <RotateCcwIcon className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                                    </button>
                                </div>
                                
                                <div className="bg-white border border-gray-100 rounded-xl divide-y divide-gray-50 shadow-sm max-h-[300px] overflow-y-auto">
                                    {uploadedFiles.length === 0 ? (
                                        <div className="p-8 text-center text-gray-400 text-sm">
                                            {isRefreshing ? 'Loading assets...' : 'No files found in bucket.'}
                                        </div>
                                    ) : (
                                        uploadedFiles.map((file) => (
                                            <div key={file.id} className="p-3 flex items-center gap-3 group hover:bg-gray-50 transition-colors">
                                                <div className={`w-10 h-10 rounded-lg flex-shrink-0 overflow-hidden border relative ${file.status === 'error' ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-gray-100'}`}>
                                                    {file.status === 'error' ? (
                                                        <div className="w-full h-full flex items-center justify-center text-red-500">
                                                            <XIcon className="w-4 h-4" />
                                                        </div>
                                                    ) : file.type.startsWith('image/') ? (
                                                        <img 
                                                            src={file.url} 
                                                            className="w-full h-full object-cover" 
                                                            alt="preview"
                                                            referrerPolicy="no-referrer"
                                                            onError={(e) => {
                                                                e.currentTarget.style.display = 'none';
                                                                e.currentTarget.parentElement?.classList.add('fallback-icon');
                                                            }}
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center">
                                                            <LinkIcon className="w-4 h-4 text-gray-400" />
                                                        </div>
                                                    )}
                                                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100 hidden group-[.fallback-icon]:flex">
                                                        <LinkIcon className="w-4 h-4 text-gray-400" />
                                                    </div>
                                                </div>
                                                
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                                                        {file.status === 'uploading' && (
                                                            <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[9px] font-bold rounded uppercase">Uploading...</span>
                                                        )}
                                                        {file.status === 'error' && (
                                                            <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-[9px] font-bold rounded uppercase">Failed</span>
                                                        )}
                                                    </div>
                                                    {file.status === 'error' ? (
                                                        <p className="text-[10px] text-red-600 font-mono mt-0.5 leading-tight truncate max-w-[120px]">{file.errorMessage}</p>
                                                    ) : (
                                                        <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-500 hover:underline truncate block">
                                                            {file.url}
                                                        </a>
                                                    )}
                                                </div>

                                                <button 
                                                    onClick={() => copyToClipboard(file.url)}
                                                    disabled={file.status !== 'success'}
                                                    className={`p-2 rounded-lg border border-transparent shadow-sm transition-all ${file.status === 'success' ? 'text-gray-400 hover:text-gray-900 hover:bg-white hover:border-gray-200' : 'opacity-30 cursor-not-allowed'}`}
                                                    title={file.status === 'success' ? "Copy URL" : "Unavailable"}
                                                >
                                                    <CopyIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default SupabaseStorageManager;
