import { useRef, type RefObject } from "react";
import { Camera, Check, Loader2, Upload } from "lucide-react";

interface DualPhotoSlotProps {
  photo: string | null;
  slotLabel: string;
  processing?: boolean;
  testId: string;
  cameraLabel: string;
  galleryLabel: string;
  onFileSelected: (ref: RefObject<HTMLInputElement | null>) => void;
}

export function DualPhotoSlot({
  photo,
  slotLabel,
  processing = false,
  testId,
  cameraLabel,
  galleryLabel,
  onFileSelected,
}: DualPhotoSlotProps) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const handleChange = (ref: RefObject<HTMLInputElement | null>) => {
    onFileSelected(ref);
    if (ref.current) ref.current.value = "";
  };

  if (photo) {
    return (
      <div
        className="w-full h-16 border-2 border-green-500 bg-green-50 rounded-lg flex flex-col items-center justify-center gap-1 relative overflow-hidden"
        data-testid={testId}
      >
        <img src={photo} alt={slotLabel} className="absolute inset-0 w-full h-full object-cover opacity-30" />
        <Check className="h-4 w-4 text-green-600 relative z-10" />
        <span className="text-xs font-medium text-green-700 relative z-10">{slotLabel}</span>
        <div className="flex gap-2 relative z-10">
          <button
            type="button"
            className="text-[10px] text-blue-600 underline"
            onClick={() => cameraRef.current?.click()}
          >
            {cameraLabel}
          </button>
          <button
            type="button"
            className="text-[10px] text-blue-600 underline"
            onClick={() => galleryRef.current?.click()}
          >
            {galleryLabel}
          </button>
        </div>
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={() => handleChange(cameraRef)}
        />
        <input
          ref={galleryRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={() => handleChange(galleryRef)}
        />
      </div>
    );
  }

  return (
    <div
      className="w-full h-16 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center gap-3"
      data-testid={testId}
    >
      <button
        type="button"
        className="flex flex-col items-center gap-0.5 text-slate-500 hover:text-blue-600 transition-colors px-2"
        onClick={() => cameraRef.current?.click()}
        disabled={processing}
      >
        {processing ? <Loader2 className="h-4 w-4 animate-spin text-blue-500" /> : <Camera className="h-4 w-4" />}
        <span className="text-[10px]">{processing ? "..." : cameraLabel}</span>
      </button>
      <div className="w-px h-8 bg-slate-300" />
      <button
        type="button"
        className="flex flex-col items-center gap-0.5 text-slate-500 hover:text-blue-600 transition-colors px-2"
        onClick={() => galleryRef.current?.click()}
        disabled={processing}
      >
        <Upload className="h-4 w-4" />
        <span className="text-[10px]">{galleryLabel}</span>
      </button>
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={() => handleChange(cameraRef)}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={() => handleChange(galleryRef)}
      />
    </div>
  );
}

interface DualPhotoFieldProps {
  photo: string | null;
  label: string;
  optionalLabel?: string;
  processing?: boolean;
  testId: string;
  cameraLabel: string;
  galleryLabel: string;
  onFileSelected: (ref: RefObject<HTMLInputElement | null>) => void;
  onClear?: () => void;
}

export function DualPhotoField({
  photo,
  label,
  optionalLabel,
  processing = false,
  testId,
  cameraLabel,
  galleryLabel,
  onFileSelected,
  onClear,
}: DualPhotoFieldProps) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const handleChange = (ref: RefObject<HTMLInputElement | null>) => {
    onFileSelected(ref);
    if (ref.current) ref.current.value = "";
  };

  return (
    <div>
      <label className="text-sm font-medium text-slate-700 mb-1.5 block">
        {label}{" "}
        {optionalLabel ? <span className="text-slate-400 font-normal">({optionalLabel})</span> : null}
      </label>
      {photo ? (
        <div className="relative rounded-lg overflow-hidden border border-slate-200">
          <img src={photo} alt={label} className="w-full h-36 object-cover" data-testid={`img-${testId}`} />
          {processing && (
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-white" />
            </div>
          )}
          <div className="absolute top-1 right-1 flex gap-1">
            {onClear && (
              <button
                type="button"
                className="bg-black/50 text-white text-xs px-2 py-1 rounded"
                onClick={onClear}
              >
                ×
              </button>
            )}
          </div>
          <div className="absolute bottom-0 inset-x-0 bg-black/40 flex justify-center gap-4 py-2">
            <button type="button" className="text-xs text-white flex items-center gap-1" onClick={() => cameraRef.current?.click()}>
              <Camera className="h-3.5 w-3.5" /> {cameraLabel}
            </button>
            <button type="button" className="text-xs text-white flex items-center gap-1" onClick={() => galleryRef.current?.click()}>
              <Upload className="h-3.5 w-3.5" /> {galleryLabel}
            </button>
          </div>
        </div>
      ) : (
        <div className="w-full h-28 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center gap-8">
          <button
            type="button"
            className="flex flex-col items-center gap-1 text-slate-500 hover:text-blue-600 transition-colors"
            onClick={() => cameraRef.current?.click()}
            disabled={processing}
            data-testid={`button-camera-${testId}`}
          >
            {processing ? <Loader2 className="h-5 w-5 animate-spin text-blue-500" /> : <Camera className="h-5 w-5" />}
            <span className="text-xs">{cameraLabel}</span>
          </button>
          <div className="w-px h-10 bg-slate-300" />
          <button
            type="button"
            className="flex flex-col items-center gap-1 text-slate-500 hover:text-blue-600 transition-colors"
            onClick={() => galleryRef.current?.click()}
            disabled={processing}
            data-testid={`button-gallery-${testId}`}
          >
            <Upload className="h-5 w-5" />
            <span className="text-xs">{galleryLabel}</span>
          </button>
        </div>
      )}
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={() => handleChange(cameraRef)} />
      <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={() => handleChange(galleryRef)} />
    </div>
  );
}
