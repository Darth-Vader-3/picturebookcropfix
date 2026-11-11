import React, { useState, useEffect, useRef } from 'react';
import { BookPage, PictureBook } from '../types';
import { ErrorBoundary } from './ErrorBoundary';
import { ImageOff, AlertCircle, RefreshCw, Upload, Edit3, HelpCircle, Check, Info, Maximize2, Minimize2 } from 'lucide-react';
import { TRANSLATIONS } from '../translations';
import { compressImageFile } from '../utils/storage';

// High-quality dedicated SVG fallback artwork per art-form
export const SCULPTURE_FALLBACK_SVG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 450' width='600' height='450'%3E%3Cdefs%3E%3ClinearGradient id='bg' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%23ffedd5'/%3E%3Cstop offset='100%25' stop-color='%23fed7aa'/%3E%3C/linearGradient%3E%3ClinearGradient id='pot' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%23ea580c'/%3E%3Cstop offset='50%25' stop-color='%23c2410c'/%3E%3Cstop offset='100%25' stop-color='%239a3412'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='600' height='450' fill='url(%23bg)' rx='20'/%3E%3Cellipse cx='300' cy='390' rx='180' ry='24' fill='%23fdba74' opacity='0.5'/%3E%3Crect x='210' y='360' width='180' height='30' rx='6' fill='%2378350f' opacity='0.3'/%3E%3Cpath d='M250 140 Q300 120 350 140 Q370 170 380 230 Q390 310 350 350 Q300 365 250 350 Q210 310 220 230 Q230 170 250 140 Z' fill='url(%23pot)'/%3E%3Cellipse cx='300' cy='140' rx='50' ry='16' fill='%23fed7aa' stroke='%239a3412' stroke-width='4'/%3E%3Cpath d='M225 210 Q170 230 220 300' fill='none' stroke='%239a3412' stroke-width='14' stroke-linecap='round'/%3E%3Cpath d='M375 210 Q430 230 380 300' fill='none' stroke='%239a3412' stroke-width='14' stroke-linecap='round'/%3E%3Cpath d='M240 250 Q300 270 360 250' fill='none' stroke='%23ffedd5' stroke-width='6' stroke-dasharray='10 6' opacity='0.8'/%3E%3Ctext x='300' y='65' font-family='system-ui, -apple-system, sans-serif' font-size='20' font-weight='800' fill='%237c2d12' text-anchor='middle'%3E🏺 3D Sculpture Reference%3C/text%3E%3Ctext x='300' y='92' font-family='system-ui, -apple-system, sans-serif' font-size='13' font-weight='600' fill='%239a3412' text-anchor='middle'%3EHandcrafted Clay & Pottery Art Guide%3C/text%3E%3C/svg%3E";

export const PAINTING_FALLBACK_SVG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 450' width='600' height='450'%3E%3Cdefs%3E%3ClinearGradient id='bg' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%23fef3c7'/%3E%3Cstop offset='100%25' stop-color='%23fde68a'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='600' height='450' fill='url(%23bg)' rx='20'/%3E%3Cpath d='M180 390 L270 120 L330 120 L420 390' stroke='%2378350f' stroke-width='12' stroke-linecap='round' fill='none'/%3E%3Crect x='170' y='160' width='260' height='170' rx='8' fill='%23ffffff' stroke='%23d97706' stroke-width='6'/%3E%3Cpath d='M190 290 Q240 200 300 260 T410 220' fill='none' stroke='%233b82f6' stroke-width='10' stroke-linecap='round'/%3E%3Cpath d='M200 270 Q280 190 350 250' fill='none' stroke='%23ef4444' stroke-width='8' stroke-linecap='round'/%3E%3Ccircle cx='230' cy='200' r='18' fill='%23f59e0b'/%3E%3Ctext x='300' y='65' font-family='system-ui, -apple-system, sans-serif' font-size='20' font-weight='800' fill='%2378350f' text-anchor='middle'%3E🎨 Painting & Canvas Reference%3C/text%3E%3Ctext x='300' y='92' font-family='system-ui, -apple-system, sans-serif' font-size='13' font-weight='600' fill='%23b45309' text-anchor='middle'%3EWatercolor & Acrylic Fine Art%3C/text%3E%3C/svg%3E";

export const CRAFT_FALLBACK_SVG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 450' width='600' height='450'%3E%3Cdefs%3E%3ClinearGradient id='bg' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%23dcfce7'/%3E%3Cstop offset='100%25' stop-color='%23bbf7d0'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='600' height='450' fill='url(%23bg)' rx='20'/%3E%3Cpolygon points='300,140 370,220 320,220 390,300 340,300 400,370 200,370 260,300 210,300 280,220 230,220' fill='%2316a34a'/%3E%3Ccircle cx='230' cy='220' r='14' fill='%23f43f5e'/%3E%3Ccircle cx='360' cy='260' r='12' fill='%230ea5e9'/%3E%3Ccircle cx='260' cy='320' r='16' fill='%23eab308'/%3E%3Ctext x='300' y='65' font-family='system-ui, -apple-system, sans-serif' font-size='20' font-weight='800' fill='%2314532d' text-anchor='middle'%3E✂️ Papercraft & Collage Reference%3C/text%3E%3Ctext x='300' y='92' font-family='system-ui, -apple-system, sans-serif' font-size='13' font-weight='600' fill='%23166534' text-anchor='middle'%3EFelt, Cutouts & Tactile Materials%3C/text%3E%3C/svg%3E";

export const ANIMATION_FALLBACK_SVG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 450' width='600' height='450'%3E%3Cdefs%3E%3ClinearGradient id='bg' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%23ede9fe'/%3E%3Cstop offset='100%25' stop-color='%23ddd6fe'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='600' height='450' fill='url(%23bg)' rx='20'/%3E%3Crect x='140' y='140' width='320' height='220' rx='16' fill='%231e1b4b'/%3E%3Cpolygon points='270,200 370,250 270,300' fill='%23a855f7'/%3E%3Ctext x='300' y='65' font-family='system-ui, -apple-system, sans-serif' font-size='20' font-weight='800' fill='%233b0764' text-anchor='middle'%3E🎬 Animation & Motion Reference%3C/text%3E%3Ctext x='300' y='92' font-family='system-ui, -apple-system, sans-serif' font-size='13' font-weight='600' fill='%23581c87' text-anchor='middle'%3EFrame-by-Frame Motion Artwork%3C/text%3E%3C/svg%3E";

export const PICTURE_FALLBACK_SVG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 450' width='600' height='450'%3E%3Cdefs%3E%3ClinearGradient id='bg' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%23fed7aa'/%3E%3Cstop offset='100%25' stop-color='%23ffedd5'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='600' height='450' fill='url(%23bg)' rx='20'/%3E%3Ccircle cx='210' cy='180' r='36' fill='%23f97316' opacity='0.8'/%3E%3Cpath d='M100 370 L240 210 L330 310 L410 230 L500 370 Z' fill='%23fb923c' opacity='0.7'/%3E%3Ctext x='300' y='65' font-family='system-ui, -apple-system, sans-serif' font-size='20' font-weight='800' fill='%237c2d12' text-anchor='middle'%3E📷 Picture Reference%3C/text%3E%3Ctext x='300' y='92' font-family='system-ui, -apple-system, sans-serif' font-size='13' font-weight='600' fill='%239a3412' text-anchor='middle'%3ENature & Still Life Photography%3C/text%3E%3C/svg%3E";

export const FALLBACK_PLACEHOLDER_IMAGE = PICTURE_FALLBACK_SVG;

export const getArtFormFallbackSvg = (artForm?: string): string => {
  switch (artForm) {
    case 'sculpture':
      return SCULPTURE_FALLBACK_SVG;
    case 'painting':
      return PAINTING_FALLBACK_SVG;
    case 'craft':
      return CRAFT_FALLBACK_SVG;
    case 'animation':
      return ANIMATION_FALLBACK_SVG;
    default:
      return PICTURE_FALLBACK_SVG;
  }
};

const CURATED_MAPPINGS: Record<string, string> = {
  'book-1-page-1': 'https://images.unsplash.com/photo-1565192647048-f997ded87958?auto=format&fit=crop&q=80&w=600',
  'book-1-page-2': 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&q=80&w=600',
  'book-1-page-3': 'https://images.unsplash.com/photo-1558060370-d644479cb6f7?auto=format&fit=crop&q=80&w=600',
  'book-2-page-1': 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&q=80&w=600',
  'book-2-page-2': 'https://images.unsplash.com/photo-1547970894-3f91a28574f8?auto=format&fit=crop&q=80&w=600',
  'book-2-page-3': 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&q=80&w=600',
  'book-3-page-1': 'https://images.unsplash.com/photo-1518156677180-95a2893f3e9f?auto=format&fit=crop&q=80&w=600',
  'book-3-page-2': 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=600',
  'book-3-page-3': 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&q=80&w=600',
};

interface IllustrationReferenceViewerProps {
  page: BookPage;
  book: PictureBook;
  theme: 'day' | 'night' | string;
  language: 'en' | 'sw';
  currentPhotoFilter?: string;
  onUpdatePageIllustration?: (newUrl: string) => void;
  onOpenWorkbench?: () => void;
}

export const IllustrationReferenceViewer: React.FC<IllustrationReferenceViewerProps> = ({
  page,
  book,
  theme,
  language,
  currentPhotoFilter,
  onUpdatePageIllustration,
  onOpenWorkbench,
}) => {
  const [hasLoadError, setHasLoadError] = useState<boolean>(false);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [showExplanation, setShowExplanation] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [showFullscreenModal, setShowFullscreenModal] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Console Log & Validation: Log candidate URLs to console on page/book change
  useEffect(() => {
    setHasLoadError(false);
    setShowExplanation(false);

    console.log(`[Illustration Reference] page data:`, {
      pageNumber: page?.pageNumber,
      pageId: page?.id,
      pageTitle: page?.title,
      artForm: page?.artForm,
      imageUrl: page?.imageUrl,
      illustrationUrl: page?.illustrationUrl,
      mediaUrl: page?.mediaUrl,
      localDataUrl: page?.localDataUrl,
      cloudStorageUrl: page?.cloudStorageUrl,
      mediaType: page?.mediaType,
      bookId: book?.id,
      bookTitle: book?.title,
      isCustom: book?.isCustom,
      retryCount,
    });
  }, [page?.id, page?.imageUrl, page?.illustrationUrl, page?.mediaUrl, page?.localDataUrl, page?.cloudStorageUrl, book?.id, retryCount]);

  // Primary URL candidates prioritizing reliable local dataUrl over potentially blocked cloud links
  const directUrl = (
    page.localDataUrl ||
    page.imageUrl ||
    page.mediaUrl ||
    page.illustrationUrl ||
    (page as any).image
  );

  // Curated fallback if system book
  const curatedFallback = !book.isCustom ? CURATED_MAPPINGS[page.id] : undefined;

  // Thematic art-form default illustration
  const artFormFallback = getArtFormFallbackSvg(page.artForm);

  // Determine initial candidate URL
  const candidateUrl = directUrl || curatedFallback;

  // Validation: Check if the candidate URL is non-empty and valid string
  const isValidCandidate = Boolean(
    candidateUrl &&
    typeof candidateUrl === 'string' &&
    candidateUrl.trim() !== '' &&
    candidateUrl.trim() !== 'undefined' &&
    candidateUrl.trim() !== 'null'
  );

  const cleanUrl = isValidCandidate ? candidateUrl!.trim() : '';
  const isVideo = page.mediaType === 'video' && cleanUrl && !cleanUrl.startsWith('data:image');

  // Handle Quick Upload from device
  const handleQuickUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const compressedDataUrl = await compressImageFile(file, 1000, 1000, 0.8);
      if (compressedDataUrl && onUpdatePageIllustration) {
        onUpdatePageIllustration(compressedDataUrl);
        setHasLoadError(false);
      }
    } catch (err) {
      console.error("Quick image compression failed:", err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // If video media type and valid
  if (isVideo && !hasLoadError) {
    return (
      <div className="relative w-full h-full min-h-[300px] sm:min-h-[360px] max-h-[420px] flex items-center justify-center overflow-hidden rounded-xl">
        <video
          src={cleanUrl}
          controls
          autoPlay
          muted
          loop
          playsInline
          className="w-full h-full object-contain rounded-lg shadow-sm border border-orange-100 bg-black/5"
          onError={() => setHasLoadError(true)}
        />
      </div>
    );
  }

  // Active image source to render:
  // If load error occurred, gracefully display artFormFallback instead of a blank dead-end!
  const effectiveImageSrc = (!hasLoadError && isValidCandidate) ? cleanUrl : artFormFallback;
  const isUsingFallbackArt = hasLoadError || !isValidCandidate;

  return (
    <ErrorBoundary
      fallback={
        <div className={`w-full h-full min-h-[300px] sm:min-h-[360px] max-h-[420px] flex flex-col items-center justify-center p-6 text-center rounded-xl border-2 border-dashed ${
          theme === 'night' ? 'bg-slate-900 border-slate-700 text-slate-300' : 'bg-amber-50 border-amber-300 text-amber-900'
        }`}>
          <ImageOff className="w-8 h-8 text-orange-400 mb-2" />
          <p className="font-display font-bold text-xs">{TRANSLATIONS[language]?.noIllustrationUploaded || 'Illustration reference'}</p>
        </div>
      }
    >
      <div 
        id="illustration-reference-frame"
        className="relative w-full h-full min-h-[300px] sm:min-h-[360px] max-h-[460px] flex items-center justify-center overflow-hidden rounded-xl bg-black/5 dark:bg-black/25 group p-2"
      >
        {/* Hidden file input for one-click image upload */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleQuickUpload}
          accept="image/*"
          className="hidden"
        />

        {/* The Artwork or Art-Form Reference Image - 100% Uncropped Full Display */}
        <img
          id="illustration-reference-image"
          src={effectiveImageSrc}
          alt={page.title || `${page.artForm} reference illustration`}
          onError={() => {
            console.warn(`[Illustration Reference] Image load error for page ${page.id}: ${cleanUrl}. Falling back to ${page.artForm} artwork.`);
            setHasLoadError(true);
          }}
          className={`max-w-full max-h-full w-auto h-auto object-contain rounded-lg shadow-sm border transition-all duration-300 ${
            theme === 'night' ? 'border-slate-800' : 'border-orange-100'
          } ${
            page.artForm === 'picture' && currentPhotoFilter === 'sunset'
              ? 'sepia brightness-110 contrast-105'
              : page.artForm === 'picture' && currentPhotoFilter === 'cyan'
              ? 'saturate-150 hue-rotate-180'
              : page.artForm === 'picture' && currentPhotoFilter === 'mono'
              ? 'grayscale contrast-125'
              : ''
          }`}
          referrerPolicy="no-referrer"
          loading="lazy"
        />

        {/* Full Image Expand Button for Uncropped Detail Inspection */}
        {!isUsingFallbackArt && (
          <button
            type="button"
            onClick={() => setShowFullscreenModal(true)}
            className="absolute top-2.5 right-2.5 p-1.5 px-2.5 rounded-lg bg-black/60 hover:bg-black/80 text-white backdrop-blur-sm border border-white/20 opacity-80 hover:opacity-100 transition duration-200 cursor-pointer shadow-md flex items-center gap-1.5 text-[11px] font-bold z-10"
            title={language === 'en' ? 'View Full Image (Uncropped)' : 'Tazama Picha Yote Bila Kukatwa'}
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{language === 'en' ? 'Full View' : 'Picha Kamili'}</span>
          </button>
        )}

        {/* Decorative watercolor or filter frame overlays for paintings */}
        {page.artForm === 'painting' && !isUsingFallbackArt && (
          <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/5 to-yellow-500/5 pointer-events-none rounded-lg mix-blend-multiply" />
        )}

        {/* Fallback Reference Guide Notice Overlay */}
        {isUsingFallbackArt && (
          <div className={`absolute top-2.5 left-2.5 right-2.5 p-2 rounded-xl border backdrop-blur-md shadow-sm transition flex flex-col gap-1.5 select-none ${
            theme === 'night'
              ? 'bg-slate-950/90 border-slate-700 text-slate-200'
              : 'bg-white/95 border-amber-200 text-amber-955'
          }`}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                {hasLoadError ? (
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                ) : (
                  <Info className="w-4 h-4 text-amber-500 shrink-0" />
                )}
                <span className="text-[11px] font-display font-bold truncate">
                  {hasLoadError
                    ? (language === 'en' ? 'Cloud image unavailable • Showing reference art' : 'Picha ya mtandaoni haijapatikana • Inaonyesha mfano')
                    : (language === 'en' ? 'No custom image attached • Showing reference art' : 'Bado picha haijawekwa • Inaonyesha mfano')}
                </span>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowExplanation(!showExplanation)}
                  className={`p-1 rounded-md text-[10px] font-bold border transition cursor-pointer flex items-center gap-0.5 ${
                    showExplanation
                      ? 'bg-amber-500 text-slate-955 border-amber-600'
                      : (theme === 'night' ? 'bg-slate-850 hover:bg-slate-800 border-slate-700 text-amber-300' : 'bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-900')
                  }`}
                  title="Explain why this happened"
                >
                  <HelpCircle className="w-3 h-3" />
                  <span className="hidden sm:inline">{language === 'en' ? 'Why?' : 'Sababu?'}</span>
                </button>

                {hasLoadError && (
                  <button
                    type="button"
                    onClick={() => {
                      setHasLoadError(false);
                      setRetryCount((c) => c + 1);
                    }}
                    className="p-1 px-2 rounded-md text-[10px] font-bold border bg-amber-500 hover:bg-amber-600 text-slate-955 border-amber-600 transition cursor-pointer flex items-center gap-1"
                    title="Retry loading image"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>{language === 'en' ? 'Retry' : 'Jaribu'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Diagnostic / Explanation Box */}
            {showExplanation && (
              <div className={`p-2 rounded-lg text-[10px] leading-relaxed border space-y-1.5 mt-0.5 ${
                theme === 'night' ? 'bg-slate-900/90 border-slate-800 text-slate-300' : 'bg-amber-50/90 border-amber-200 text-amber-900'
              }`}>
                <p>
                  <strong>{language === 'en' ? 'Reason:' : 'Sababu:'}</strong>{' '}
                  {hasLoadError
                    ? (language === 'en'
                        ? 'The cloud storage URL for this scene returned a 403 Forbidden, 404, or CORS network block in this browser. To keep your book beautiful, PictureBook automatically displays this curated 3D sculpture guide!'
                        : 'Kiungo cha hifadhi ya picha kilipata kosa la mtandao (403/CORS). PictureBook inaonyesha mfano mzuri wa sanaa badala yake!')
                    : (language === 'en'
                        ? 'This scene currently does not have an attached illustration. You can upload a photo now or edit it in Artist Workbench.'
                        : 'Ukurasa huu hauna picha iliyopakiwa bado. Unaweza kupakia picha sasa hivi au kuhariri katika Studio ya Msanii.')}
                </p>

                {/* Direct Action Buttons to fix it right now */}
                <div className="flex items-center gap-2 pt-1 flex-wrap">
                  {onUpdatePageIllustration && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-bold text-[10px] transition cursor-pointer flex items-center gap-1 shadow-2xs"
                    >
                      <Upload className="w-3 h-3" />
                      <span>{isUploading ? (language === 'en' ? 'Attaching...' : 'Inapakia...') : (language === 'en' ? 'Upload Replacement Photo' : 'Pakia Picha Mpya')}</span>
                    </button>
                  )}

                  {onOpenWorkbench && (
                    <button
                      type="button"
                      onClick={onOpenWorkbench}
                      className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-slate-955 rounded-md font-bold text-[10px] transition cursor-pointer flex items-center gap-1 shadow-2xs"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>{language === 'en' ? 'Open in Artist Workbench' : 'Fungua Studio ya Msanii'}</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Floating Quick-Fix Toolstrip at bottom on hover or fallback */}
        {isUsingFallbackArt && !showExplanation && (
          <div className="absolute bottom-3 flex items-center gap-2 backdrop-blur-md px-3 py-1.5 rounded-full border shadow-md bg-white/90 dark:bg-slate-900/90 border-amber-300 dark:border-slate-700">
            {onUpdatePageIllustration && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Upload className="w-3 h-3" />
                <span>{isUploading ? 'Attaching...' : (language === 'en' ? 'Attach Photo' : 'Weka Picha')}</span>
              </button>
            )}

            {onOpenWorkbench && (
              <>
                <span className="text-slate-300 dark:text-slate-600">•</span>
                <button
                  type="button"
                  onClick={onOpenWorkbench}
                  className="text-[10px] font-bold text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>{language === 'en' ? 'Edit in Workbench' : 'Hariri'}</span>
                </button>
              </>
            )}
          </div>
        )}

        {/* Dynamic Watermark Overlay */}
        {(book.downloadPermission || 'yes') === 'watermark' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
            <div className="text-white/40 text-[9px] sm:text-[10px] font-display font-extrabold uppercase tracking-wider rotate-[-25deg] border-2 border-white/20 px-2.5 py-1 bg-black/15 rounded-lg backdrop-blur-[0.5px]">
              PictureBook Copyright • {book.author}
            </div>
          </div>
        )}
      </div>

      {/* Fullscreen Uncropped Lightbox Modal */}
      {showFullscreenModal && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 sm:p-6"
          onClick={() => setShowFullscreenModal(false)}
        >
          <div className="relative max-w-5xl max-h-[92vh] w-full flex flex-col items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <div className="w-full flex items-center justify-between pb-3 text-white">
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-sm tracking-wide">{page.title || 'Illustration Reference'}</span>
                <span className="text-xs text-emerald-400 bg-emerald-950/80 border border-emerald-500/40 px-2 py-0.5 rounded-full font-bold">
                  {language === 'en' ? 'Full Uncropped' : 'Picha Kamili'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowFullscreenModal(false)}
                className="py-1 px-3 rounded-full bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer backdrop-blur-md border border-white/20"
                title="Close full view"
              >
                <Minimize2 className="w-4 h-4" />
                <span>{language === 'en' ? 'Close' : 'Funga'}</span>
              </button>
            </div>
            <div className="w-full flex items-center justify-center p-2 rounded-2xl bg-black/40 border border-white/10 overflow-auto max-h-[80vh]">
              <img
                src={effectiveImageSrc}
                alt={page.title || "Full uncropped illustration"}
                className="max-w-full max-h-[76vh] w-auto h-auto object-contain rounded-xl shadow-2xl"
              />
            </div>
          </div>
        </div>
      )}
    </ErrorBoundary>
  );
};
