
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState } from 'react';
import { ShirtIcon } from './icons';
import { motion, AnimatePresence } from 'framer-motion';

interface NavbarProps {
  onOpenProfile?: () => void;
  currentShop?: string;
  onSelectShop?: (shopId: string) => void;
}

const SHOPS = [
    { id: 'all', name: 'Boutique Pro' },
    { id: 'vazi', name: 'Vazi' },
    { id: 'msupa', name: 'Msupa' },
];

const Navbar: React.FC<NavbarProps> = ({ onOpenProfile, currentShop = 'all', onSelectShop }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Find current shop display name
  const activeShop = SHOPS.find(s => s.id === currentShop) || SHOPS[0];

  const handleShopSelect = (shopId: string) => {
    if (onSelectShop) {
        onSelectShop(shopId);
    }
    setIsDropdownOpen(false);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 h-14 bg-white/90 backdrop-blur-md border-b border-gray-100 flex items-center justify-between px-4 z-[100]">
      
      {/* Left: Shop Selector Dropdown */}
      <div className="relative">
          <button 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-50 border border-gray-200 shadow-sm hover:bg-gray-100 transition-colors active:scale-95"
            aria-label="Switch Shop"
          >
            <ShirtIcon className="w-4 h-4 text-gray-800" />
          </button>

          <AnimatePresence>
            {isDropdownOpen && (
                <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute top-full left-0 mt-3 w-48 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-[101] flex flex-col py-1 ring-1 ring-black/5"
                >
                    <div className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50">
                        Select Store
                    </div>
                    {SHOPS.map((shop) => (
                        <button
                            key={shop.id}
                            onClick={() => handleShopSelect(shop.id)}
                            className={`w-full text-left px-4 py-3 text-xs font-medium transition-colors flex items-center justify-between ${currentShop === shop.id ? 'bg-gray-50 text-gray-900 font-bold' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
                        >
                            {shop.name}
                            {currentShop === shop.id && (
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                            )}
                        </button>
                    ))}
                </motion.div>
            )}
          </AnimatePresence>
      </div>

      {/* Center: App/Shop Name */}
      <div className="absolute left-1/2 transform -translate-x-1/2 pointer-events-none">
        <span className="text-sm font-serif font-bold tracking-widest text-gray-900 uppercase">
          {activeShop.name === 'Boutique Pro' ? 'Boutique Pro' : `${activeShop.name} Store`}
        </span>
      </div>

      {/* Right: Account Profile */}
      <button 
        onClick={onOpenProfile}
        className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 border border-gray-200 hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-200 shadow-sm active:scale-95"
      >
         <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-gray-600">
            <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z" clipRule="evenodd" />
         </svg>
      </button>

      {/* Click outside to close dropdown overlay */}
      {isDropdownOpen && (
        <div className="fixed inset-0 z-[90]" onClick={() => setIsDropdownOpen(false)}></div>
      )}
    </nav>
  );
};

export default Navbar;
