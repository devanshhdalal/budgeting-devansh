import { useEffect, useRef, useState } from 'react';
import { Camera, Image as ImageIcon } from 'lucide-react';

const CardImageUpload = ({ imageUrl, previewUrl, onFileSelect, onClear, required = false }) => {
  const cameraInputRef = useRef(null);
  const libraryInputRef = useRef(null);
  const [localPreview, setLocalPreview] = useState(null);
  const displayUrl = previewUrl || localPreview || imageUrl;

  useEffect(() => {
    return () => {
      if (localPreview) URL.revokeObjectURL(localPreview);
    };
  }, [localPreview]);

  const handleChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (localPreview) URL.revokeObjectURL(localPreview);
    const url = URL.createObjectURL(file);
    setLocalPreview(url);
    onFileSelect?.(file, url);
    e.target.value = '';
  };

  const handleClear = () => {
    if (localPreview) URL.revokeObjectURL(localPreview);
    setLocalPreview(null);
    onClear?.();
  };

  return (
    <div className="card-image-upload">
      <label className="form-label">
        Card photo {required && <span className="form-label-required">*</span>}
      </label>
      <p className="card-image-hint">Take a photo or upload an image of the physical card for display.</p>
      {displayUrl ? (
        <div className="card-image-preview-wrap">
          <img src={displayUrl} alt="Card preview" className="card-image-preview" />
          <button type="button" className="card-image-change-btn" onClick={() => libraryInputRef.current?.click()}>
            Change photo
          </button>
          <button type="button" className="card-image-clear-btn" onClick={handleClear}>
            Remove
          </button>
        </div>
      ) : (
        <button type="button" className="card-image-dropzone" onClick={() => cameraInputRef.current?.click()}>
          <Camera size={22} />
          <span>Take photo or upload</span>
        </button>
      )}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleChange}
        hidden
      />
      <label className="card-image-alt-link">
        <ImageIcon size={16} />
        <span>{displayUrl ? 'Replace from library' : 'Choose from library'}</span>
        <input ref={libraryInputRef} type="file" accept="image/*" onChange={handleChange} hidden />
      </label>
    </div>
  );
};

export default CardImageUpload;
