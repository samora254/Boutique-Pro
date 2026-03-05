# Product Requirements Document (PRD): Boutique Pro Admin Dashboard & AI Import

## 1. Project Overview
**Boutique Pro** is an AI-powered e-commerce platform that simplifies the process of adding and managing inventory. The core innovation is an **Admin Dashboard** that uses Gemini AI to analyze product images (from local uploads or Supabase Storage) and automatically extract product details, generating clean product-only images from model shots.

## 2. Target Audience
- **Shop Owners:** Who need to quickly digitize their inventory.
- **Inventory Managers:** Who handle large batches of product images stored in cloud storage (Supabase).

## 3. Key Features

### 3.1. Admin Dashboard
- **View Management:** Toggle between "Add New", "Manage Stock", and "Edit" views.
- **Inventory Overview:** A scannable list of all products in the store, with inline editing for stock and price.
- **Shop Filtering:** View products by shop (e.g., "Vazi", "Msupa").

### 3.2. AI-Powered Product Extraction
- **Image Analysis:** Uses `gemini-3-flash-preview` to analyze images and extract:
    - Brand Name
    - Category (Tops, Jeans, Jackets, etc.)
    - Description
    - Suggested Price
    - Target Shop (based on gender/style detection)
- **Background Removal / Product Extraction:** Uses `gemini-2.5-flash-image` to generate a clean, product-only image from a source image (e.g., a model wearing the item).
- **Revert Functionality:** Allows users to undo AI image generation and return to the original source image.

### 3.3. Supabase Storage Integration
- **Storage Asset Browser:** A modal picker to browse and select images directly from a Supabase bucket.
- **Batch Import:** Select multiple images from Supabase for bulk AI analysis and inventory addition.
- **Single Image Selection:** Select a single image from Supabase to populate the "Add Product" form.
- **Persistence:** AI-generated images are automatically uploaded back to Supabase to ensure permanent, high-quality storage.

### 3.4. Supabase Storage Manager
- **Connection Setup:** Interface to enter Supabase credentials (URL, Anon Key, Bucket Name).
- **Provisioning:** Automatically checks for bucket existence and initializes the storage environment.
- **File Upload:** Drag-and-drop or click-to-upload interface for adding new assets to Supabase.

## 4. Technical Architecture

### 4.1. Frontend
- **Framework:** React with TypeScript.
- **Styling:** Tailwind CSS for a minimalist, high-end aesthetic.
- **Animations:** Framer Motion for smooth transitions and interactive feedback.
- **Icons:** Lucide React.

### 4.2. AI Integration
- **SDK:** `@google/genai`.
- **Models:**
    - `gemini-3-flash-preview`: For text-based product analysis and metadata extraction.
    - `gemini-2.5-flash-image`: For image-to-image generation (extracting product from model).

### 4.3. Cloud Storage
- **SDK:** `@supabase/supabase-js`.
- **Operations:** `list`, `upload`, `getPublicUrl`, `createBucket`.

## 5. User Interface Design

### 5.1. Aesthetic
- **Minimalist E-Commerce:** High contrast, generous whitespace, and refined typography (Inter, Serif accents).
- **Color Palette:** Slate, Zinc, and Emerald (for success/publish actions).

### 5.2. Key Components
- **AdminDashboard.tsx:** The main hub for inventory management.
- **SupabaseStorageManager.tsx:** Dedicated tool for Supabase configuration and uploads.
- **Storage Picker Modal:** An overlay within the dashboard for selecting cloud assets.

## 6. Workflow: Importing from Supabase
1. **Open Admin Dashboard:** Click the "Admin" button in the profile panel.
2. **Scan Storage:** Click "Import" to open the picker.
3. **Select Images:** Choose one or more images from the cloud.
4. **Analyze:**
    - **Single:** Populates the form with AI-extracted details.
    - **Batch:** Automatically creates "New" products in the inventory list for later refinement.
5. **Refine & Publish:** Edit details, generate clean images if needed, and click "Publish".

## 7. Error Handling & Resilience
- **CORS Mitigation:** Supabase Storage provides standard public URLs that are easily accessible via fetch when configured correctly.
- **AI Safety:** Robust handling for AI refusals or safety policy blocks during image generation.
- **Credential Fallback:** Uses environment variables (`VITE_SUPABASE_URL`, etc.) with manual overrides in the UI.
