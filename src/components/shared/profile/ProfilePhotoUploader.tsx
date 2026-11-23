import { useState, useRef, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { Camera, Upload, ZoomIn, ZoomOut } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/hooks/useLanguage';
import { normalizeAvatarUrl } from '@/utils/avatarUrl';
import { getCroppedImage } from '@/utils/cropImage';
import Cropper, { Area } from 'react-easy-crop';

interface ProfilePhotoUploaderProps {
  initialPhoto?: string;
  userName: string;
  onPhotoChange: (file: File, url: string) => void;
}

export default function ProfilePhotoUploader({
  initialPhoto,
  userName,
  onPhotoChange,
}: ProfilePhotoUploaderProps) {
  const { t } = useLanguage('profile');
  const [photoUrl, setPhotoUrl] = useState(normalizeAvatarUrl(initialPhoto));
  const [isCropOpen, setIsCropOpen] = useState(false);
  const [cropImageUrl, setCropImageUrl] = useState<string>('');
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const currentPreviewUrlRef = useRef<string | null>(null);

  // Update photoUrl when initialPhoto changes (after API response)
  useEffect(() => {
    setPhotoUrl(normalizeAvatarUrl(initialPhoto));
  }, [initialPhoto]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error(t('photoUploader.fileTypeError'));
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('photoUploader.fileSizeError'));
      return;
    }

    const localPreviewUrl = URL.createObjectURL(file);
    setCropImageUrl(localPreviewUrl);
    setPendingFile(file);
    setIsCropOpen(true);

    // Clear input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleCropComplete = (_: Area, croppedArea: Area) => {
    setCroppedAreaPixels(croppedArea);
  };

  const handleCropCancel = () => {
    if (cropImageUrl) {
      URL.revokeObjectURL(cropImageUrl);
    }
    setCropImageUrl('');
    setPendingFile(null);
    setIsCropOpen(false);
  };

  const handleCropConfirm = async () => {
    if (!pendingFile || !croppedAreaPixels || !cropImageUrl) {
      handleCropCancel();
      return;
    }

    try {
      setIsUploading(true);
      const { blob, url } = await getCroppedImage(cropImageUrl, croppedAreaPixels);
      const croppedFile = new File([blob], pendingFile.name, { type: blob.type });

      if (currentPreviewUrlRef.current) {
        URL.revokeObjectURL(currentPreviewUrlRef.current);
      }
      currentPreviewUrlRef.current = url;

      setPhotoUrl(url);
      onPhotoChange(croppedFile, url);
      toast.success(t('photoUploader.photoUpdated'));

    } catch (error) {
      console.error('Error cropping photo:', error);
      toast.error(t('photoUploader.uploadError'));
    } finally {
      setIsUploading(false);
      URL.revokeObjectURL(cropImageUrl);
      setCropImageUrl('');
      setPendingFile(null);
      setIsCropOpen(false);
    }
  };


  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="flex items-center gap-6">
      <div className="relative">
        <Avatar className="size-24">
          <AvatarImage src={photoUrl} alt={userName} />
          <AvatarFallback className="font-semibold text-lg">{getUserInitials(userName)}</AvatarFallback>
        </Avatar>

        <button
          type="button"
          onClick={handleUploadClick}
          disabled={isUploading}
          aria-label={t('photoUploader.changePhoto')}
          className="absolute inset-0 flex items-center justify-center rounded-full bg-foreground/56 text-background opacity-0 outline-none transition-opacity hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <Camera className="size-6" />
        </button>
      </div>

      <div className="flex flex-col items-start gap-2">
        <Button variant="outline" size="sm" onClick={handleUploadClick} loading={isUploading}>
          {!isUploading && <Upload />}
          {isUploading ? t('photoUploader.uploading') : t('photoUploader.changePhoto')}
        </Button>
        <p className="text-muted-foreground text-xs">{t('photoUploader.fileInfo')}</p>
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />

      <Dialog
        open={isCropOpen}
        onOpenChange={open => {
          if (open) {
            setIsCropOpen(true);
          } else {
            handleCropCancel();
          }
        }}
      >
        <DialogPopup className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('photoUploader.changePhoto')}</DialogTitle>
          </DialogHeader>

          <DialogPanel className="flex flex-col gap-4">
            <div className="relative h-80 w-full overflow-hidden rounded-xl bg-muted">
              {cropImageUrl && (
                <Cropper
                  image={cropImageUrl}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  onCropChange={setCrop}
                  onCropComplete={handleCropComplete}
                  onZoomChange={setZoom}
                />
              )}
            </div>

            <div className="flex items-center gap-3">
              <ZoomOut className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <Slider
                min={1}
                max={3}
                step={0.1}
                value={zoom}
                onValueChange={value => setZoom(Array.isArray(value) ? value[0] : value)}
                getAriaLabel={() => t('photoUploader.changePhoto')}
              />
              <ZoomIn className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            </div>
          </DialogPanel>

          <DialogFooter>
            <DialogClose render={<Button variant="ghost" />}>{t('common.cancel')}</DialogClose>
            <Button onClick={handleCropConfirm} loading={isUploading}>
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogPopup>
      </Dialog>
    </div>
  );
}
