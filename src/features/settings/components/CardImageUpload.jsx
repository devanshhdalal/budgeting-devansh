import { useEffect, useRef, useState } from 'react';
import { Camera, Image as ImageIcon } from 'lucide-react';
import CardImage from '@/components/ui/CardImage';
import { CARD_IMAGE_HEIGHT, CARD_IMAGE_WIDTH } from '@/config/cardImage';

const CardImageUpload = ({ imageUrl, previewUrl, onFileSelect, onClear, required = false, network = '' }) => {
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
      <p className="card-image-hint">
        Upload a photo of the physical card. Recommended size: {CARD_IMAGE_WIDTH}×{CARD_IMAGE_HEIGHT} px.
      </p>
      {displayUrl ? (
        <div className="card-image-preview-wrap">
          <CardImage src={displayUrl} network={network} alt="Card preview" size="md" />
          <div className="card-image-preview-actions">
            <button type="button" className="card-image-change-btn" onClick={() => libraryInputRef.current?.click()}>
              Change photo
            </button>
            <button type="button" className="card-image-clear-btn" onClick={handleClear}>
              Remove
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className="card-image-dropzone" onClick={() => cameraInputRef.current?.click()}>
          <Camera size={22} />
          <span>{CARD_IMAGE_WIDTH}×{CARD_IMAGE_HEIGHT}</span>
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
