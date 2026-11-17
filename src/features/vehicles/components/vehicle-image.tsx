"use client";

import { useState } from "react";
import { Car, Motorbike, Truck } from "lucide-react";
import type { VehicleType } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";

const ICONS = { MOTORCYCLE: Motorbike, CAR: Car, OTHER: Truck } as const;

/** Fahrzeugfoto von einer externen URL, mit Symbol als Ersatz, falls das Bild fehlt oder nicht lädt. */
export function VehicleImage({ src, type, alt, className }: { src: string | null; type: VehicleType; alt: string; className?: string }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const Icon = ICONS[type];

  if (!src || failedSrc === src) {
    return (
      <div className={cn("flex items-center justify-center bg-gradient-to-br from-panel-2 to-ink", className)}>
        <Icon className="size-12 text-line" strokeWidth={1.25} aria-hidden />
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailedSrc(src)}
      className={cn("object-cover", className)}
    />
  );
}
