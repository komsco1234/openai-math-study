"use strict";

// Google Tag Manager loader. Kept in a file because the site's CSP blocks inline scripts.
// GA4 is configured inside the GTM container, not here.
(() => {
  const containerId = "GTM-KWFMNN6B";
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${containerId}`;
  document.head.append(script);
})();
