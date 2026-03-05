
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useRef, useEffect } from 'react';
import AuthForm from './AuthForm';
import { CameraIcon, UserIcon, PencilIcon, CheckCircleIcon, XIcon, SparklesIcon } from './icons';
import Spinner from './Spinner';
import { UserProfile } from '../types';

interface ProfilePanelProps {
  savedLooksCount: number;
  wardrobeCount: number;
  onOpenVibeCheck: () => void;
  onOpenWardrobe: () => void;
  onOpenAdmin: () => void;
  isAuthenticated: boolean;
  onLogin: (profile?: UserProfile) => void;
  onLogout: () => void;
  currentAvatarUrl?: string | null;
  onUpdateAvatar?: (file: File) => void;
  isProcessingAvatar?: boolean;
  userProfile?: UserProfile;
}

const ProfilePanel: React.FC<ProfilePanelProps> = ({ 
  savedLooksCount, 
  wardrobeCount, 
  onOpenVibeCheck, 
  onOpenWardrobe,
  onOpenAdmin,
  isAuthenticated,
  onLogin,
  onLogout,
  currentAvatarUrl,
  onUpdateAvatar,
  isProcessingAvatar = false,
  userProfile
}) => {
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const defaultUser: UserProfile = {
    username: "Guest Stylist",
    email: "guest@boutiquepro.com",
    details: {
        Gender: "Female",
        "Shirt Size": "M",
        "Shoe Size": "39",
        "Waist Size": "28",
        "Cup Size": "B"
    }
  };

  const [userData, setUserData] = useState<UserProfile>(userProfile || defaultUser);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<UserProfile>(userProfile || defaultUser);

  useEffect(() => {
    if (userProfile) {
        setUserData(userProfile);
        setFormData(userProfile);
    }
  }, [userProfile]);

  if (!isAuthenticated) {
    return (
      <div className="pt-4 pb-8">
        <AuthForm 
          mode={authMode}
          onToggleMode={() => setAuthMode(prev => prev === 'signin' ? 'signup' : 'signin')}
          onComplete={onLogin}
        />
      </div>
    );
  }

  const handleAvatarClick = () => {
    if (!isProcessingAvatar && fileInputRef.current) {
        fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && onUpdateAvatar) {
        onUpdateAvatar(e.target.files[0]);
    }
  };

  const startEditing = () => {
    setFormData(userData);
    setIsEditing(true);
  };

  const saveChanges = () => {
    setUserData(formData);
    setIsEditing(false);
  };

  const cancelEditing = () => {
    setIsEditing(false);
  };

  const handleDetailChange = (key: string, value: string) => {
    setFormData(prev => ({
        ...prev,
        details: {
            ...prev.details,
            [key]: value
        }
    }));
  };

  return (
    <div className="flex flex-col items-center pt-2 pb-6 w-full animate-fade-in relative">
      
      {/* Admin Button - Absolute Position Top Right */}
      <button 
        onClick={onOpenAdmin}
        className="absolute top-0 right-0 flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-full hover:bg-gray-100 transition-all text-[10px] font-bold text-gray-500 uppercase tracking-widest shadow-sm active:scale-95"
      >
        <SparklesIcon className="w-3 h-3" />
        Admin
      </button>

      {/* My Avatar Section */}
      <div className="flex flex-col items-center mb-6">
        <div 
            className={`
                relative w-28 h-28 rounded-full border-4 border-gray-50 shadow-sm overflow-hidden mb-3
                ${isProcessingAvatar ? 'cursor-not-allowed opacity-80' : 'cursor-pointer group hover:border-gray-200'}
            `}
            onClick={handleAvatarClick}
        >
            {isProcessingAvatar ? (
                <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                    <Spinner />
                </div>
            ) : currentAvatarUrl ? (
                <img src={currentAvatarUrl} alt="My Avatar" className="w-full h-full object-cover" />
            ) : (
                <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-300">
                    <UserIcon className="w-12 h-12" />
                </div>
            )}
            
            {!isProcessingAvatar && (
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <CameraIcon className="w-8 h-8 text-white drop-shadow-md" />
                </div>
            )}
        </div>
        
        <button 
            onClick={handleAvatarClick}
            disabled={isProcessingAvatar}
            className="text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors disabled:opacity-50"
        >
            {isProcessingAvatar ? 'Updating...' : (currentAvatarUrl ? 'Change Avatar' : 'Upload Avatar')}
        </button>
        <input 
            ref={fileInputRef}
            type="file" 
            accept="image/png, image/jpeg, image/webp" 
            className="hidden" 
            onChange={handleFileChange}
        />
      </div>

      <div className="flex flex-col items-center mb-6 border-b border-gray-100 pb-6 w-full max-w-xs relative">
        {isEditing ? (
            <input 
                type="text" 
                value={formData.username}
                onChange={(e) => setFormData({...formData, username: e.target.value})}
                className="text-xl font-serif font-bold text-gray-900 tracking-wide text-center bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 mb-1 focus:ring-2 focus:ring-blue-100 outline-none w-full"
            />
        ) : (
            <div className="flex items-center gap-2">
                 <h2 className="text-xl font-serif font-bold text-gray-900 tracking-wide">{userData.username}</h2>
                 <button onClick={startEditing} className="text-gray-400 hover:text-gray-600 transition-colors">
                    <PencilIcon className="w-4 h-4" />
                 </button>
            </div>
        )}
        <p className="text-xs text-gray-500 font-medium">{userData.email}</p>
      </div>

      <div className="flex w-full max-w-xs justify-center gap-3 mb-8">
        <button 
            onClick={onOpenVibeCheck}
            className="flex-1 bg-white rounded-xl p-3 text-center border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 transition-all active:scale-[0.98] group"
        >
          <p className="text-2xl font-bold text-gray-900 group-hover:text-gray-700 transition-colors">{savedLooksCount}</p>
          <p className="text-[10px] uppercase tracking-wider text-gray-500 font-medium mt-1">Saved Vibes</p>
        </button>
        <button 
            onClick={onOpenWardrobe}
            className="flex-1 bg-white rounded-xl p-3 text-center border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 transition-all active:scale-[0.98] group"
        >
          <p className="text-2xl font-bold text-gray-900 group-hover:text-gray-700 transition-colors">{wardrobeCount}</p>
          <p className="text-[10px] uppercase tracking-wider text-gray-500 font-medium mt-1">Wardrobe</p>
        </button>
      </div>

      <div className="relative w-full max-w-xs bg-gray-50 rounded-xl p-5 border border-gray-100 transition-all">
        {!isEditing && (
             <button 
                onClick={startEditing}
                className="absolute top-2 right-2 p-2 text-gray-400 hover:text-gray-700 transition-colors rounded-full hover:bg-white/60 active:scale-95 z-10"
                title="Edit Details"
            >
                <PencilIcon className="w-3.5 h-3.5" />
            </button>
        )}

        <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 border-b border-gray-200 pb-2 flex items-center justify-between">
            Measurements
            <span className="text-gray-300 font-normal normal-case pt-0.5">Private</span>
        </h3>
        
        <div className="grid grid-cols-2 gap-y-4 gap-x-2">
            {Object.entries(isEditing ? formData.details : userData.details).map(([label, value]) => (
                <div key={label}>
                    <p className="text-[10px] text-gray-500 uppercase mb-0.5">{label}</p>
                    {isEditing ? (
                        <input 
                            type="text"
                            value={value}
                            onChange={(e) => handleDetailChange(label, e.target.value)}
                            className="text-sm font-medium text-gray-900 bg-white border border-gray-200 rounded px-2 py-1 w-full focus:ring-1 focus:ring-gray-300 focus:border-gray-400 outline-none transition-all"
                        />
                    ) : (
                        <p className="text-sm font-medium text-gray-900 h-[26px] flex items-center">{value}</p>
                    )}
                </div>
            ))}
        </div>
      </div>
      
      {isEditing ? (
        <div className="mt-8 flex gap-3 w-full max-w-xs">
            <button 
                onClick={cancelEditing}
                className="flex-1 flex items-center justify-center px-4 py-2.5 rounded-lg border border-gray-200 text-gray-600 font-medium text-xs hover:bg-gray-50 transition-colors"
            >
                <XIcon className="w-4 h-4 mr-2" />
                Cancel
            </button>
            <button 
                onClick={saveChanges}
                className="flex-1 flex items-center justify-center px-4 py-2.5 rounded-lg bg-gray-900 text-white font-medium text-xs hover:bg-gray-800 transition-colors shadow-sm"
            >
                <CheckCircleIcon className="w-4 h-4 mr-2" />
                Save Changes
            </button>
        </div>
      ) : (
        <button 
            onClick={onLogout}
            className="mt-8 text-xs text-red-400 hover:text-red-600 font-medium transition-colors opacity-80 hover:opacity-100"
        >
            Sign Out
        </button>
      )}

      <div className="mt-6 text-[10px] text-gray-300">
        Boutique Pro v1.0.0
      </div>
    </div>
  );
};

export default ProfilePanel;
