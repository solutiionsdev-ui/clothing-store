import { renderBrandIcon } from "@/utils/seo/brand-image";

/** Favicon, and the manifest's icon — one size the browser scales down. */
export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return renderBrandIcon(size.width);
}
