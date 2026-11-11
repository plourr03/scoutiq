// Astro configuration for scout-iq.com.
// Static output only. Pages build to flat files (privacy.html) so Firebase
// Hosting can serve them at clean addresses (/privacy) with cleanUrls.
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://scout-iq.com',
  output: 'static',
  trailingSlash: 'never',
  build: {
    format: 'file',
    // Small pages: keep CSS in the HTML so the first paint needs no extra request.
    inlineStylesheets: 'always',
  },
  devToolbar: { enabled: false },
});
