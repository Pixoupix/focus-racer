"use client";

import Image, { ImageProps } from "next/image";

/**
 * ProtectedImage — wraps Next.js Image with anti-theft protections:
 * - Transparent overlay blocks right-click "Save Image As" and drag-and-drop
 * - onContextMenu/onDragStart disabled on the wrapper
 * - CSS pointer-events:none on the actual <img> (overlay captures all events)
 * - user-select:none prevents text-selection-based copy
 *
 * NOTE: This does NOT prevent screenshots or DevTools network inspection.
 * The real protection is the watermark + low-resolution thumbnails.
 * HD originals are only served after purchase via signed URLs.
 */
export default function ProtectedImage(props: ImageProps) {
  return (
    <div
      className="protected-image-wrapper"
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
      style={{ position: "relative", width: "100%", height: "100%" }}
    >
      <Image {...props} draggable={false} />
      {/* Transparent overlay: captures all pointer events, blocks Save Image As */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 1,
          background: "transparent",
          userSelect: "none",
          WebkitUserSelect: "none",
          WebkitTouchCallout: "none",
        }}
      />
    </div>
  );
}
