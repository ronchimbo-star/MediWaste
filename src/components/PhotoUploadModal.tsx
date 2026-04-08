import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { useToastContext } from '../contexts/ToastContext';

interface PhotoUploadModalProps {
  jobId: string;
  jobNumber: string;
  onClose: () => void;
  onPhotoAdded: () => void;
}

export default function PhotoUploadModal({ jobId, jobNumber, onClose, onPhotoAdded }: PhotoUploadModalProps) {
  const { toast } = useToastContext();
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [description, setDescription] = useState('');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const validFiles = files.filter(f => f.type.startsWith('image/'));

      if (validFiles.length !== files.length) {
        toast.error('Only image files are allowed');
      }

      setSelectedFiles(prev => [...prev, ...validFiles]);

      validFiles.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviewUrls(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast.error('Please select at least one photo');
      return;
    }

    setUploading(true);
    try {
      const uploadedPhotos = [];

      for (const file of selectedFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${jobId}-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `job-photos/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('mediwaste-storage')
          .upload(filePath, file);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          throw uploadError;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('mediwaste-storage')
          .getPublicUrl(filePath);

        uploadedPhotos.push({
          url: publicUrl,
          storage_path: filePath
        });
      }

      for (const photo of uploadedPhotos) {
        const { error: dbError } = await supabase
          .from('mw_job_photos')
          .insert([{
            job_id: jobId,
            photo_url: photo.url,
            storage_path: photo.storage_path,
            description: description || null
          }]);

        if (dbError) throw dbError;
      }

      toast.success(`${uploadedPhotos.length} photo(s) uploaded successfully`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      onPhotoAdded();
      onClose();
    } catch (error) {
      console.error('Error uploading photos:', error);
      toast.error('Failed to upload photos. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Add Photos</h2>
              <p className="text-gray-600 mt-1">Job: {jobNumber}</p>
            </div>
            <button
              onClick={onClose}
              disabled={uploading}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent"
              placeholder="Add notes about these photos..."
              disabled={uploading}
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Photos
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                disabled={uploading}
                className="hidden"
                id="photo-upload"
              />
              <label
                htmlFor="photo-upload"
                className="cursor-pointer flex flex-col items-center"
              >
                <Upload className="w-12 h-12 text-gray-400 mb-2" />
                <p className="text-sm text-gray-600">
                  Click to select photos or drag and drop
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  PNG, JPG, JPEG up to 10MB each
                </p>
              </label>
            </div>
          </div>

          {previewUrls.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3">
                Selected Photos ({selectedFiles.length})
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {previewUrls.map((url, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={url}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    <button
                      onClick={() => removeFile(index)}
                      disabled={uploading}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                      {(selectedFiles[index].size / 1024 / 1024).toFixed(2)} MB
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              disabled={uploading}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={uploading || selectedFiles.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-[#F59E0B] text-white rounded-lg hover:bg-[#D97706] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Uploading...
                </>
              ) : (
                <>
                  <ImageIcon className="w-4 h-4" />
                  Upload {selectedFiles.length} Photo{selectedFiles.length !== 1 ? 's' : ''}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}