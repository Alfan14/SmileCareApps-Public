import { useState } from "react";
import { ImageOff } from "lucide-react";
import { cn } from "../../lib/cn";

type Props = {
  src: string;
  alt: string;
  className?: string;
  loading?: "eager" | "lazy";
  fetchPriority?: "high" | "low" | "auto";
  fallbackLabel?: string;
};

/** Local clinic image with a calm placeholder when an asset is not present yet. */
export function ClinicImage({
  src,
  alt,
  className,
  loading = "lazy",
  fetchPriority,
  fallbackLabel = "Image coming soon",
}: Props) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={cn(
          "flex items-center justify-center bg-gradient-to-br from-brand-soft to-white text-brand-deep",
          className,
        )}
      >
        <span className="flex flex-col items-center gap-2 rounded-xl bg-white/80 px-4 py-3 text-center shadow-sm">
          <ImageOff className="h-6 w-6" aria-hidden="true" />
          <span className="text-xs font-medium">{fallbackLabel}</span>
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading={loading}
      fetchPriority={fetchPriority}
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
