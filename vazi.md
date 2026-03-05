# VAZI CHECK - Product Requirement Document (PRD)

## 1. App Overview
**App Name:** Vazi Check  
**Purpose:** An AI-powered virtual try-on application that allows users to upload a photo of themselves and digitally try on various garments. It transforms a user's photo into a professional model base and uses Generative AI to layer outfits realistically.
**Core Technology:** React (Frontend), Google Gemini API (`gemini-2.5-flash-image`) for image generation.

---

## 2. User Flow & Logic
The application follows a linear flow with a central "Hub" (The Canvas).

1.  **Authentication (Entry):** User signs in or signs up via the Profile panel (currently simulated).
2.  **Start Screen (Onboarding):**
    *   User sees a "Before/After" slider demonstrating the tech.
    *   User uploads a raw full-body photo.
    *   **Logic:** The app sends this image to Gemini to "standardize" it (remove background, fix lighting, ensure 3:4 aspect ratio) to create a **Base Model**.
3.  **The Dressing Room (Main Canvas):**
    *   The Base Model is displayed.
    *   User interacts with **Wardrobe**, **Stack**, or **Poses**.
4.  **Virtual Try-On (Action):**
    *   User selects items from the Wardrobe.
    *   **Logic:** The app sends the current model image + garment image(s) to Gemini with a prompt to "replace clothing" while preserving the face and body.
    *   The result is displayed as a **Preview Layer**.
5.  **Refinement:**
    *   User can change poses (regenerates the outfit in a new stance).
    *   User can remove the last added layer via the Stack.
6.  **Finalization:**
    *   User clicks "Save Look".
    *   **Logic:** Image is saved to the local "Vibe Check" gallery, the image downloads to the device, and the "Preview" is committed to the "History Stack".

---

## 3. Core Features & Functional Specifications

### A. Authentication & Profile
*   **Location:** Accessed via the top-right avatar icon.
*   **Auth Form:** Minimalist toggle between Sign In and Sign Up.
    *   *Inputs:* Name, Email, Password.
*   **Profile View:**
    *   Displays Username and Email.
    *   **Stats Dashboard:** Links to "Saved Vibes" (Gallery) and "Wardrobe".
    *   **Measurements:** Read-only display of user sizing (Gender, Shirt, Shoe, Waist, Cup).
    *   **Action:** Sign Out.

### B. Start Screen (Model Generation)
*   **UI:** "Compare" slider component showing raw vs. processed results.
*   **Upload:** Input for standard image formats.
*   **Process:** Displays a spinner and status text ("Analyzing pose...", "Finalizing...").
*   **Output:** Sets the `modelImageUrl` in global state.

### C. The Canvas (Main Interface)
*   **Display:** locked **3:4 Portrait Aspect Ratio** container.
*   **Image Rendering:** Uses `object-contain` to ensure no cropping occurs regardless of screen size.
*   **Top Controls:**
    *   *Start Over:* Resets the app state to the Start Screen.
*   **Image Overlay Actions:**
    *   *Save Look:* Top-right corner. Checks for duplicates before saving.
    *   *Buy Button:* Shows a "Coming Soon" tooltip on click.
    *   *Share:* Uses Web Share API. Fallback to Clipboard copy if native share fails.
*   **Bottom Controls:**
    *   *Pose Selectors:* Horizontal scroll or grid of pose chips (e.g., "Full frontal", "Side profile").
    *   *Navigation Bar:* Buttons for Stack, Wardrobe, and Vibe Check.

### D. Wardrobe System
*   **Layout:** Single-page modal with vertical scrolling.
*   **Categories:** Tops, Bottoms, Footwear, Accessories (displayed as horizontal scrolling strips).
*   **Functionality:**
    1.  **Single Selection:** Clicking an item immediately triggers a try-on generation.
    2.  **Batch Selection (Full Check):** User toggles "Select Multiple". Allows selecting one item per category. Clicking "Vibe Check" generates an outfit with all selected items simultaneously.
    3.  **Upload:** Users can upload their own garment images into categories.
*   **State:** visual indicators for "Worn" items (green dot) and "Selected" items (ring/checkmark).

### E. Outfit Stack (History)
*   **Purpose:** Manages the layers of generation.
*   **UI:** List of steps (e.g., "Base Model", "Outfit 1", "Outfit 2").
*   **Function:** Allows the user to "Undo" by removing the latest layer.

### F. Vibe Check Gallery (Saved Looks)
*   **Display:** Grid view of saved outfit images.
*   **Detail View:**
    *   Large preview of the saved look.
    *   **Composition List:** Shows thumbnails and names of all garments used in that specific look.
    *   **Share:** Ability to share the saved look directly.

### G. Security (Screen Protection)
*   **Web:** Blocks Context Menu (Right-click), Drag-and-Drop, and specific screenshot keyboard shortcuts.
*   **Native (Prepared):** Hook `useScreenProtection` is ready for React Native implementation to block OS-level screenshots using `expo-screen-capture`.

---

## 4. Technical Architecture

### Tech Stack
*   **Framework:** React 19 (Vite).
*   **Styling:** Tailwind CSS.
*   **Animations:** Framer Motion (`AnimatePresence`, `motion.div`).
*   **AI SDK:** `@google/genai` (Gemini API).

### Data Structures (`types.ts`)
*   `WardrobeItem`: { id, name, url, category }.
*   `OutfitLayer`: { garment(s), poseImages: Record<poseName, url> }.
*   `SavedLook`: { id, imageUrl, timestamp, layers[] }.

### Services (`geminiService.ts`)
*   **Model:** `gemini-2.5-flash-image`.
*   **Prompt Engineering:**
    *   *Model Gen:* Enforces clean background (#f0f0f0) and professional standing pose.
    *   *Try-On:* Instructions to "REMOVE original clothing" and "LAYER" new garments naturally.
    *   *Pose:* Instructions to keep clothing/identity identical but change perspective.

---

## 5. Design System & Theme

### Philosophy
**"Minimalist E-Commerce"**: The design prioritizes the image content. The UI is monochromatic to ensure the user's outfit colors pop.

### Typography
*   **Headings:** `Instrument Serif` (Elegant, Editorial feel).
*   **Body:** `Inter` (Clean, legible, modern).

### Color Palette
*   **Primary Background:** White (`#ffffff`).
*   **Secondary Backgrounds:** Light Gray (`#f9fafb` / `gray-50`).
*   **Text (Primary):** Dark Gray/Black (`gray-900` / `#111827`).
*   **Text (Secondary):** Medium Gray (`gray-500`).
*   **Accents:**
    *   *Success:* Green (`green-500`) - Used for checkmarks.
    *   *Error:* Red (`red-500`) - Used for error toasts.
    *   *Buttons:* Solid Black with White text (Call to Actions).

### UI Components
*   **Buttons:** Rounded corners (`rounded-xl` or `rounded-full`), slight drop shadows, scaling animation on click (`active:scale-95`).
*   **Modals:** Bottom-sheet style or centered cards with backdrop blur (`backdrop-blur-sm`).
*   **Loading States:**
    *   Spinners.
    *   Shimmer/Pulse effects on image placeholders.
    *   "Coming Soon" tooltips using `AnimatePresence`.

## 6. Future Roadmap
1.  **React Native Port:** Logic is separated (hooks/services) to facilitate moving to Expo.
2.  **E-commerce Integration:** "Buy" button to link to actual product URLs.
3.  **User Persistence:** Connect Auth to a real backend (Firebase/Supabase) to persist Wardrobe and Gallery across sessions.
