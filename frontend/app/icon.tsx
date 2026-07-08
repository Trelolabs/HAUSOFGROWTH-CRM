import { ImageResponse } from "next/og"

// Favicon shown left of "HOG Agency CRM" in the browser tab.
// Generated from code so it matches the <HogLogo /> used in the
// Sidebar and Login page (flat dark disc + "HOG" wordmark).
export const size = { width: 64, height: 64 }
export const contentType = "image/png"

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "50%",
          background: "radial-gradient(circle at 50% 45%, #8f1d2d 0%, #3d0a12 42%, #0a0708 100%)",
          color: "#F8F4EF",
          fontSize: 17,
          fontWeight: 700,
          letterSpacing: 2,
        }}
      >
        HOG
      </div>
    ),
    { ...size }
  )
}
