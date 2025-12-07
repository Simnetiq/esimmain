import { storage } from '../firebase/config';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

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

  // Upload image to Firebase Storage
  async uploadImage(file, path = 'blog-images') {
    try {
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
      const timestamp = Date.now();
      const fileName = `${timestamp}-${fileToUpload.name}`;
      const storageRef = ref(storage, `${path}/${fileName}`);

      // Upload file
      const snapshot = await uploadBytes(storageRef, fileToUpload);
      
      // Get download URL
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      return {
        success: true,
        url: downloadURL,
        fileName: fileName,
        path: snapshot.ref.fullPath,
        originalSize: file.size,
        compressedSize: fileToUpload.size,
        compressionRatio: ((1 - fileToUpload.size / file.size) * 100).toFixed(1) + '%'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Delete image from Firebase Storage
  async deleteImage(imageUrl) {
    try {
      // Extract path from URL
      const url = new URL(imageUrl);
      const pathMatch = url.pathname.match(/\/o\/(.+)\?/);
      
      if (!pathMatch) {
        throw new Error('Invalid image URL');
      }

      const imagePath = decodeURIComponent(pathMatch[1]);
      const imageRef = ref(storage, imagePath);
      
      await deleteObject(imageRef);
      
      return {
        success: true
      };
    } catch (error) { 
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
