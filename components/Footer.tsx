
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';

interface FooterProps {
  isOnDressingScreen?: boolean;
  onHome?: () => void;
  onTryOn?: () => void;
}

const Footer: React.FC<FooterProps> = ({ isOnDressingScreen = false, onHome, onTryOn }) => {
  return (
    <footer className={`fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-gray-200/60 p-3 z-50 ${isOnDressingScreen ? 'hidden sm:block' : ''}`}>
      <div className="mx-auto flex flex-row items-center justify-between text-xs text-gray-600 max-w-7xl px-4 w-full">
        {/* Left: Home Shortcut */}
        <button 
          onClick={onHome}
          className="font-medium hover:text-gray-900 transition-colors active:scale-95"
        >
          Home
        </button>

        {/* Center: Credits */}
        <p className="text-center">
          Created by{' '}
          <a 
            href="https://www.instagram.com/samora_kibagendi?igsh=MW56MTRlaWlvcHRjdA%3D%3D&utm_source=qr" 
            target="_blank" 
            rel="noopener noreferrer"
            className="font-semibold text-gray-800 hover:underline"
          >
            @Samora
          </a>
        </p>

        {/* Right: Try-On Shortcut */}
        <button 
          onClick={onTryOn}
          className="font-medium hover:text-gray-900 transition-colors active:scale-95"
        >
          Try-On
        </button>
      </div>
    </footer>
  );
};

export default Footer;