import { getSupabase, isSupabaseAvailable } from '../lib/supabase';

// Storage bucket name for blog images
const BUCKET_NAME = 'blog-images';

export const imageUploadService = {
  // Convert image to WebP format
  async convertToWebP(file, quality = 0.85) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        const img = new Image();

        img.onload = () => {
          // Create canvas
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;

          // Draw image on canvas
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);

          // Convert to WebP
          canvas.toBlob(
            (blob) => {
              if (blob) {
                // Create new file with WebP extension
                const originalName = file.name.replace(/\.[^/.]+$/, '');
                const webpFile = new File([blob], `${originalName}.webp`, {
                  type: 'image/webp',
                  lastModified: Date.now()
                });

                resolve(webpFile);
              } else {
                reject(new Error('Failed to convert image to WebP'));
              }
            },
            'image/webp',
            quality
          );
        };

        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target.result;
      };

      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  },

  // Upload image to Supabase Storage
  async uploadImage(file, path = 'blog-images') {
    try {
      if (!isSupabaseAvailable()) {
        throw new Error('Supabase not available');
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        throw new Error('File must be an image');
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        throw new Error('File size must be less than 5MB');
      }

      // Convert image to WebP format (unless it's already WebP)
      let fileToUpload = file;
      if (file.type !== 'image/webp') {
        fileToUpload = await this.convertToWebP(file);
      }

      // Generate unique filename
      // Files are stored directly in the bucket root (no subfolders needed)
      const timestamp = Date.now();
      const fileName = `${timestamp}-${fileToUpload.name}`;
      const filePath = fileName;

      const supabase = getSupabase();

      // Upload file to Supabase Storage
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, fileToUpload, {
          cacheControl: '3600',
          upsert: false,
          contentType: 'image/webp'
        });

      if (error) {
        console.error('[imageUploadService] Upload error:', error);
        throw error;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(data.path);

      return {
        success: true,
        url: urlData.publicUrl,
        fileName: fileName,
        path: data.path,
        originalSize: file.size,
        compressedSize: fileToUpload.size,
        compressionRatio: ((1 - fileToUpload.size / file.size) * 100).toFixed(1) + '%'
      };
    } catch (error) {
      console.error('[imageUploadService] Error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Delete image from Supabase Storage
  async deleteImage(imageUrl) {
    try {
      if (!isSupabaseAvailable()) {
        throw new Error('Supabase not available');
      }

      const supabase = getSupabase();

      // Extract path from Supabase URL
      // URL format: https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>
      const url = new URL(imageUrl);
      const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)/);

      if (!pathMatch) {
        // Try Firebase URL format for backwards compatibility
        const firebaseMatch = url.pathname.match(/\/o\/(.+)\?/);
        if (firebaseMatch) {
          console.warn('[imageUploadService] Firebase URL detected, cannot delete from Supabase');
          return { success: true }; // Skip deletion for old Firebase images
        }
        throw new Error('Invalid image URL');
      }

      const imagePath = decodeURIComponent(pathMatch[1]);

      const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .remove([imagePath]);

      if (error) {
        console.error('[imageUploadService] Delete error:', error);
        throw error;
      }

      return {
        success: true
      };
    } catch (error) {
      console.error('[imageUploadService] Delete error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Validate image file
  validateImageFile(file) {
    const errors = [];

    // Check file type
    if (!file.type.startsWith('image/')) {
      errors.push('File must be an image');
    }

    // Check file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      errors.push('File size must be less than 5MB');
    }

    // Check file dimensions (optional)
    return {
      isValid: errors.length === 0,
      errors
    };
  },

  // Generate image preview URL
  generatePreviewUrl(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.readAsDataURL(file);
    });
  }
};

export default imageUploadService;
