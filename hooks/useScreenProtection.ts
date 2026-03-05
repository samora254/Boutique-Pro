/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { useEffect } from 'react';

/**
 * Hook to manage screen protection and screenshot prevention.
 * 
 * --- WEB BEHAVIOR (Active Now) ---
 * - Blocks context menu (Right Click).
 * - Blocks drag-and-drop interactions to prevent saving images.
 * - Attempts to block keyboard shortcuts for printing/saving.
 * 
 * --- REACT NATIVE MIGRATION GUIDE (Future) ---
 * When converting this app to React Native (e.g. via Expo), follow these steps:
 * 
 * 1. Install the native dependency:
 *    > npx expo install expo-screen-capture
 * 
 * 2. Uncomment the 'REACT NATIVE IMPLEMENTATION' block below.
 * 
 * --- NATIVE BEHAVIOR ---
 * - ANDROID: Uses FLAG_SECURE. This strictly blocks the "Power + Volume Down" screenshot combination.
 *            Screenshots will appear black or be rejected by the OS.
 * - iOS: Prevents screen recording and AirPlay mirroring. Note that strictly blocking the 
 *        screenshot button combo is restricted by iOS OS-level policies, but this provides 
 *        the maximum protection allowed by Apple.
 */
export const useScreenProtection = () => {
  useEffect(() => {
    // =========================================================
    // WEB IMPLEMENTATION (Current Best Effort)
    // =========================================================

    const preventDefault = (e: Event) => e.preventDefault();

    // 1. Disable Right Click / Context Menu globally
    document.addEventListener('contextmenu', preventDefault);

    // 2. Disable Dragging (prevents drag-to-desktop to save)
    window.addEventListener('dragstart', preventDefault);

    // 3. Block common keyboard shortcuts (PrintScreen, Ctrl+P, Cmd+Shift+3)
    const handleKeyDown = (e: KeyboardEvent) => {
        if (
            e.key === 'PrintScreen' || 
            (e.ctrlKey && e.key === 'p') || 
            (e.metaKey && e.shiftKey) // Mac screenshot combos
        ) {
            e.cancelBubble = true;
            e.preventDefault();
            e.stopImmediatePropagation();
        }
    };
    window.addEventListener('keydown', handleKeyDown);


    // =========================================================
    // REACT NATIVE IMPLEMENTATION (For Future App)
    // =========================================================
    
    /* 
    // UNCOMMENT THE CODE BELOW WHEN MIGRATING TO REACT NATIVE
    
    const initNativeProtection = async () => {
      // Dynamic require to ensure it doesn't break web build if package is missing
      // const ScreenCapture = require('expo-screen-capture');

      try {
        // This is the core function for blocking screenshots.
        // On Android, this sets the FLAG_SECURE window flag.
        await ScreenCapture.preventScreenCaptureAsync();
        
        // Optional: Add a listener to detect if a user *tried* to take a screenshot (mostly iOS)
        // const subscription = ScreenCapture.addScreenshotListener(() => {
        //   alert("Screenshots are not allowed in Vazi Check for privacy reasons.");
        // });
        
        console.log("Screen protection active.");
      } catch (err) {
        console.warn("Failed to enable screen protection:", err);
      }
    };

    initNativeProtection();
    */

    // CLEANUP
    return () => {
      document.removeEventListener('contextmenu', preventDefault);
      window.removeEventListener('dragstart', preventDefault);
      window.removeEventListener('keydown', handleKeyDown);

      // NATIVE CLEANUP
      /*
      // const ScreenCapture = require('expo-screen-capture');
      // ScreenCapture.allowScreenCaptureAsync();
      */
    };
  }, []);
};
