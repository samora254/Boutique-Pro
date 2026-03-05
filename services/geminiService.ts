
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { GoogleGenAI, GenerateContentResponse, Modality } from "@google/genai";
import { WardrobeItem } from "../types";

const fileToPart = async (file: File) => {
    const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
    const { mimeType, data } = dataUrlToParts(dataUrl);
    return { inlineData: { mimeType, data } };
};

const dataUrlToParts = (dataUrl: string) => {
    const arr = dataUrl.split(',');
    if (arr.length < 2) throw new Error("Invalid data URL");
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch || !mimeMatch[1]) throw new Error("Could not parse MIME type from data URL");
    return { mimeType: mimeMatch[1], data: arr[1] };
}

const dataUrlToPart = (dataUrl: string) => {
    const { mimeType, data } = dataUrlToParts(dataUrl);
    return { inlineData: { mimeType, data } };
}

// Helper to convert remote URL to Base64 for the API
const urlToBase64 = async (url: string): Promise<string> => {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

const handleApiResponse = (response: GenerateContentResponse): string => {
    // Find the first image part in any candidate
    for (const candidate of response.candidates ?? []) {
        const imagePart = candidate.content?.parts?.find(part => part.inlineData);
        if (imagePart?.inlineData) {
            const { mimeType, data } = imagePart.inlineData;
            return `data:${mimeType};base64,${data}`;
        }
    }

    const finishReason = response.candidates?.[0]?.finishReason;
    if (finishReason && finishReason !== 'STOP') {
        const errorMessage = `Image generation stopped unexpectedly. Reason: ${finishReason}. This often relates to safety settings.`;
        throw new Error(errorMessage);
    }
    const textFeedback = response.text?.trim();
    const errorMessage = `The AI model did not return an image. ` + (textFeedback ? `The model responded with text: "${textFeedback}"` : "This can happen due to safety filters or if the request is too complex. Please try a different image.");
    throw new Error(errorMessage);
};

let aiInstance: GoogleGenAI | null = null;

const getAi = () => {
    if (!aiInstance) {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error("GEMINI_API_KEY environment variable is required");
        }
        aiInstance = new GoogleGenAI({ apiKey });
    }
    return aiInstance;
};

const model = 'gemini-2.5-flash-image';

export const generateModelImage = async (userImage: File): Promise<string> => {
    const userImagePart = await fileToPart(userImage);
    const prompt = "You are an expert fashion photographer AI. Transform the person in this image into a full-body fashion model photo suitable for an e-commerce website. The background must be a clean, neutral studio backdrop (light gray, #f0f0f0). The person should have a neutral, professional model expression. Preserve the person's identity, unique features, and body type, but place them in a standard, relaxed standing model pose. The final image must be photorealistic. Ensure the subject is fully visible and centered within a 3:4 portrait aspect ratio. The output MUST be vertical. Return ONLY the final image.";
    const response = await getAi().models.generateContent({
        model,
        contents: { parts: [userImagePart, { text: prompt }] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });
    return handleApiResponse(response);
};

export const generateCloseUpImage = async (userImage: File): Promise<string> => {
    const userImagePart = await fileToPart(userImage);
    const prompt = "You are an expert fashion photographer AI. Transform the person in this image into a professional high-quality close-up headshot portrait. Focus on the face and shoulders. The background must be a clean, neutral studio backdrop (light gray, #f0f0f0). The person should have a neutral, professional model expression. Preserve the person's identity and unique features. The final image must be photorealistic. Return ONLY the final image.";
    const response = await getAi().models.generateContent({
        model,
        contents: { parts: [userImagePart, { text: prompt }] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });
    return handleApiResponse(response);
};

export const generateAvatarAssets = async (userImage: File): Promise<{ full: string, closeUp: string }> => {
    // Run generation in parallel
    const [full, closeUp] = await Promise.all([
        generateModelImage(userImage),
        generateCloseUpImage(userImage)
    ]);
    return { full, closeUp };
};

export const generateVirtualTryOnImage = async (modelImageUrl: string, garments: { file: File, info: WardrobeItem }[]): Promise<string> => {
    const modelImagePart = dataUrlToPart(modelImageUrl);
    const garmentParts = await Promise.all(garments.map(g => fileToPart(g.file)));
    
    // Analyze the garments to create contextual instructions
    const categories = garments.map(g => g.info.category);
    const lowerNames = garments.map(g => g.info.name.toLowerCase());
    
    const isSwimwear = lowerNames.some(n => 
        n.includes('bikini') || n.includes('swimsuit') || n.includes('swimwear') || n.includes('beachwear') || n.includes('lingerie')
    );
    const isFootwearOnly = categories.every(c => c === 'footwear');
    const hasTops = categories.includes('tops');
    const hasBottoms = categories.includes('bottoms');
    
    // Check if it's a single item try-on (to trigger auto-styling)
    const isSingleItem = garments.length === 1;

    let contextualPrompt = "";
    let autoStylingPrompt = "";
    let safetyPrompt = "";

    // --- SAFETY & MODESTY LOGIC (For Swimwear/Lingerie) ---
    if (isSwimwear) {
        contextualPrompt = `
- **Swimwear Context:** The model is trying on swimwear/beachwear.
- **Requirement:** Completely remove previous street clothes (jeans, shirts) and replace with the swimwear.`;
        
        // Critical: Add modesty layer to prevent safety blocking while allowing fit check
        safetyPrompt = `
- **SAFETY & MODESTY PROTOCOL:** To ensure this image is appropriate for general e-commerce audiences and does not violate safety policies:
  1. Style the look with a tasteful, semi-transparent beach cover-up, an open silk robe, or a sarong tied loosely around the waist.
  2. Ensure the pose is elegant, professional, and non-suggestive (standard catalog pose).
  3. The goal is to show the FIT of the item while maintaining a modest, high-fashion aesthetic.`;
    }

    // --- AUTO-STYLING LOGIC (Completing the Look) ---
    if (isSingleItem && !isFootwearOnly && !isSwimwear) {
        if (hasTops) {
            autoStylingPrompt = `
- **Stylist Instruction (Complete the Look):** The user has only selected a TOP. 
  You MUST generate a matching, stylish BOTTOM to complete the outfit. 
  Do not leave the model in their original bottoms if they clash. 
  Example: If the top is a formal blouse, generate matching trousers or a skirt. If it's a casual tee, generate jeans.`;
        } else if (hasBottoms) {
            autoStylingPrompt = `
- **Stylist Instruction (Complete the Look):** The user has only selected a BOTTOM. 
  You MUST generate a matching, stylish TOP to complete the outfit. 
  Do not leave the model in their original top if it clashes. 
  Example: If the bottom is a skirt, generate a cute fitted top.`;
        }
    }

    // --- STANDARD CONTEXTUAL LOGIC ---
    if (isFootwearOnly) {
        contextualPrompt = `
- **Footwear Context:** The user is only checking shoes. PRESERVE the model's current outfit (shirts, pants, jackets) exactly as they are. ONLY replace the footwear.`;
    } else if (hasBottoms && !hasTops && !isSingleItem) {
        contextualPrompt += `
- **Bottoms Context:** Only a bottom piece is being changed. Preserve the model's current top/shirt, but replace the pants/skirt.`;
    } else if (hasTops && !hasBottoms && !isSingleItem) {
        contextualPrompt += `
- **Tops Context:** Only a top piece is being changed. Replace the model's current shirt.`;
    }

    // Overall Stylistic Intelligence
    contextualPrompt += `
- **Stylistic Coherence:** Do not pair contradictory styles.
- **Anatomical Integrity:** Ensure the clothing fits the model's specific body shape and pose naturally, showing realistic folds, fabric stretching, and shadows.`;

    const prompt = `You are an expert virtual try-on AI. You will be given a 'model image' and ${garments.length} 'garment image(s)'. Your task is to create a new photorealistic image where the person from the 'model image' is wearing the provided clothing items.

**Instructions:**
1.  **Garment Handling:** If a garment image shows a set (e.g. top + shorts), you MUST extract and apply BOTH pieces.
2.  **Context:** ${contextualPrompt}
3.  **Auto-Styling:** ${autoStylingPrompt}
4.  **Safety:** ${safetyPrompt}
5.  **Preservation:** Preserve the model's identity (face/hair) and the background.
6.  **Output:** Return ONLY the final, vertical (3:4) image.`;

    const response = await getAi().models.generateContent({
        model,
        contents: { parts: [modelImagePart, ...garmentParts, { text: prompt }] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });
    return handleApiResponse(response);
};

export const generatePoseVariation = async (tryOnImageUrl: string, poseInstruction: string): Promise<string> => {
    const tryOnImagePart = dataUrlToPart(tryOnImageUrl);
    const prompt = `You are an expert fashion photographer AI. Take this image and regenerate it from a different perspective. The person, clothing, and background style must remain identical. The new perspective should be: "${poseInstruction}".
    
    IMPORTANT: The final image MUST be in a vertical portrait format (3:4 aspect ratio). Do not generate landscape images.
    Return ONLY the final image.`;
    
    const response = await getAi().models.generateContent({
        model,
        contents: { parts: [tryOnImagePart, { text: prompt }] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });
    return handleApiResponse(response);
};

export const generateRecoloredProduct = async (productImageUrl: string, targetColorName: string, targetColorHex: string): Promise<string> => {
    // 1. Convert remote URL to Base64 to make it compatible with the API
    const base64Image = await urlToBase64(productImageUrl);
    const imagePart = dataUrlToPart(base64Image);

    const prompt = `You are a professional product photo editor. 
    Task: Change the color of the main clothing item or accessory in this image to ${targetColorName} (Hex: ${targetColorHex}).
    Constraints:
    1. Maintain the exact original lighting, shadows, texture, and fabric details.
    2. Keep the background completely white or exactly as it is in the original.
    3. Do not change the shape or style of the item.
    4. Return ONLY the modified image.`;

    const response = await getAi().models.generateContent({
        model,
        contents: { parts: [imagePart, { text: prompt }] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });
    return handleApiResponse(response);
};
