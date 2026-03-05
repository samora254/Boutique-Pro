
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
 
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getFriendlyErrorMessage(error: unknown, context: string): string {
    let rawMessage = 'An unknown error occurred.';
    if (error instanceof Error) {
        rawMessage = error.message;
    } else if (typeof error === 'string') {
        rawMessage = error;
    } else if (error) {
        rawMessage = String(error);
    }

    // Check for specific unsupported MIME type error from Gemini API
    if (rawMessage.includes("Unsupported MIME type")) {
        try {
            // It might be a JSON string like '{"error":{"message":"..."}}'
            const errorJson = JSON.parse(rawMessage);
            const nestedMessage = errorJson?.error?.message;
            if (nestedMessage && nestedMessage.includes("Unsupported MIME type")) {
                const mimeType = nestedMessage.split(': ')[1] || 'unsupported';
                return `File type '${mimeType}' is not supported. Please use a format like PNG, JPEG, or WEBP.`;
            }
        } catch (e) {
            // Not a JSON string, but contains the text. Fallthrough to generic message.
        }
        // Generic fallback for any "Unsupported MIME type" error
        return `Unsupported file format. Please upload an image format like PNG, JPEG, or WEBP.`;
    }
    
    return `${context}. ${rawMessage}`;
}

/**
 * Applies a "3D Glassmorphic" watermark diagonally across the image.
 * Returns a Blob of the watermarked image.
 */
export async function addWatermark(imageUrl: string, text: string = "Boutique Pro"): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = imageUrl;
        
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            if (!ctx) {
                reject(new Error("Could not get canvas context"));
                return;
            }
            
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            
            // Draw original image
            ctx.drawImage(img, 0, 0);
            
            const w = canvas.width;
            const h = canvas.height;
            // Calculate diagonal size to ensure text fits
            const diagonal = Math.sqrt(w * w + h * h);
            const fontSize = Math.max(40, w * 0.15); // Dynamic font size ~15% of width
            
            ctx.save();
            ctx.translate(w / 2, h / 2);
            ctx.rotate(-Math.PI / 4); // -45 degrees diagonal
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            // Font settings - Ultra Bold
            ctx.font = `900 ${fontSize}px "Inter", sans-serif`;
            
            // 1. Drop Shadow (creates the floating depth)
            ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
            ctx.shadowBlur = 20;
            ctx.shadowOffsetX = 10;
            ctx.shadowOffsetY = 10;
            
            // 2. Main Text Fill (Glassy semi-transparent white)
            ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
            ctx.fillText(text, 0, 0);
            
            // 3. Reset Shadow for crisp borders/highlights
            ctx.shadowColor = "transparent";
            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
            
            // 4. Edge Highlight (Glass rim effect)
            ctx.lineWidth = fontSize * 0.025;
            ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
            ctx.strokeText(text, 0, 0);
            
            // 5. Subtle Inner bevel highlight (offset slightly up-left)
            ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
            ctx.fillText(text, -2, -2);
            
            ctx.restore();
            
            canvas.toBlob((blob) => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error("Canvas blob creation failed"));
                }
            }, 'image/png');
        };
        
        img.onerror = (err) => reject(err);
    });
}
