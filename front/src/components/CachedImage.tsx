import React, { useState, useEffect } from 'react';
import { useImageCache } from '../hooks/useImageCache';

interface CachedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  id?: string;
  src: string;
  instanceId?: number;
}

const CachedImage: React.FC<CachedImageProps> = ({ id, src, instanceId, alt, className, ...props }) => {
  const { getOrFetchImage } = useImageCache();
  const [imgSrc, setImgSrc] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!src) return;

    // Se já é data URL, usa direto
    if (src.startsWith('data:')) {
      setImgSrc(src);
      return;
    }

    setLoading(true);
    setError(false);

    // Passa direto pro useImageCache - ele sabe tratar msg_id:
    getOrFetchImage(src, instanceId)
      .then((cachedUrl) => {
        if (cachedUrl) {
          setImgSrc(cachedUrl);
        } else {
          setError(true);
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [src, id, instanceId]);

  if (loading) {
    return <div className={`${className} bg-gray-200 animate-pulse rounded flex items-center justify-center`}>
      <span className="text-xs text-gray-400">Carregando...</span>
    </div>;
  }

  if (error || !imgSrc) {
    return <div className={`${className} bg-gray-100 rounded flex items-center justify-center`}>
      <span className="text-xs text-gray-400">Erro</span>
    </div>;
  }



  return (
    <img
      src={imgSrc}
      alt={alt || ''}
      className={className}
      loading="lazy"
      {...props}
    />
  );
};

export default CachedImage;
