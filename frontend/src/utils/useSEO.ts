import { useEffect } from "react";

interface SEOProps {
  title?: string;
  description?: string;
  canonicalUrl?: string;
  ogImage?: string;
  structuredData?: object;
}

export function useSEO({
  title,
  description,
  canonicalUrl,
  ogImage,
  structuredData,
}: SEOProps) {
  useEffect(() => {
    // 1. Update Title
    if (title) {
      document.title = `${title} | KitabGhar`;
    }

    // 2. Update Meta Description
    if (description) {
      let metaDesc = document.querySelector('meta[name="description"]');
      if (!metaDesc) {
        metaDesc = document.createElement("meta");
        metaDesc.setAttribute("name", "description");
        document.head.appendChild(metaDesc);
      }
      metaDesc.setAttribute("content", description);

      let ogDesc = document.querySelector('meta[property="og:description"]');
      if (ogDesc) ogDesc.setAttribute("content", description);
    }

    // 3. Update OG Title
    if (title) {
      let ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) ogTitle.setAttribute("content", `${title} | KitabGhar`);
    }

    // 4. Update OG Image
    if (ogImage) {
      let ogImg = document.querySelector('meta[property="og:image"]');
      if (ogImg) ogImg.setAttribute("content", ogImage);
    }

    // 5. Update / Inject Structured Data JSON-LD
    let scriptTag: HTMLScriptElement | null = null;
    if (structuredData) {
      scriptTag = document.createElement("script");
      scriptTag.type = "application/ld+json";
      scriptTag.id = "page-structured-data";
      scriptTag.textContent = JSON.stringify(structuredData);
      document.head.appendChild(scriptTag);
    }

    return () => {
      if (scriptTag && scriptTag.parentNode) {
        scriptTag.parentNode.removeChild(scriptTag);
      }
    };
  }, [title, description, canonicalUrl, ogImage, structuredData]);
}
