'use client';

import { useState, useRef, useCallback } from 'react';
import { Camera, X, Upload, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui';

interface PhotoUploadProps {
  photos: string[];
  onPhotosChange: (photos: string[]) => void;
  maxPhotos?: number;
  required?: boolean;
}

export function PhotoUpload({
  photos,
  onPhotosChange,
  maxPhotos = 5,
  required = true,
}: PhotoUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;

      setIsUploading(true);
      try {
        const newPhotos: string[] = [];

        for (let i = 0; i < files.length && photos.length + newPhotos.length < maxPhotos; i++) {
          const file = files[i];
          if (!file.type.startsWith('image/')) continue;

          // Convert to base64 for preview (in production, upload to storage)
          const reader = new FileReader();
          const base64 = await new Promise<string>((resolve) => {
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          });

          // In production, this would upload to Supabase Storage
          // For now, we'll use base64 for demonstration
          newPhotos.push(base64);
        }

        onPhotosChange([...photos, ...newPhotos]);
      } finally {
        setIsUploading(false);
      }
    },
    [photos, maxPhotos, onPhotosChange]
  );

  const handleRemovePhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    onPhotosChange(newPhotos);
  };

  const canAddMore = photos.length < maxPhotos;

  return (
    <div className="space-y-3">
      {/* Label */}
      <div className="flex items-center gap-2">
        <Camera className="w-4 h-4 text-gray-500" />
        <span className="text-sm font-medium text-gray-700">
          หลักฐานการใช้งาน
          {required && <span className="text-red-500 ml-1">*</span>}
        </span>
      </div>

      {/* Photo Grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((photo, index) => (
            <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
              <img
                src={photo}
                alt={`หลักฐาน ${index + 1}`}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => handleRemovePhoto(index)}
                className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload Buttons */}
      {canAddMore && (
        <div className="flex gap-2">
          {/* Camera Button (Mobile) */}
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            onClick={() => cameraInputRef.current?.click()}
            disabled={isUploading}
          >
            <Camera className="w-4 h-4 mr-2" />
            ถ่ายรูป
          </Button>

          {/* Gallery Button */}
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            <ImageIcon className="w-4 h-4 mr-2" />
            เลือกรูป
          </Button>

          {/* Hidden File Inputs */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files)}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files)}
          />
        </div>
      )}

      {/* Helper Text */}
      <p className="text-xs text-gray-500">
        {photos.length}/{maxPhotos} รูป
        {required && photos.length === 0 && (
          <span className="text-red-500 ml-2">กรุณาถ่ายรูปหลักฐานก่อนบันทึก</span>
        )}
      </p>
    </div>
  );
}
