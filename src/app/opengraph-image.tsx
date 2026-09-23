import { siteConfig } from "@/lib/site";
import { renderBrandCard } from "@/utils/seo/brand-image";

/** The default share card for every route that does not ship its own. */
export const alt = siteConfig.name;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return renderBrandCard(size.width, size.height);
}
