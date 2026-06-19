// vite.config.js
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5273,
    // strictPort: if 5273 is already taken, FAIL loudly instead of silently
    // moving to another port. This prevents the "I see the old version"
    // confusion where a stale dev server on a fallback port gets served.
    strictPort: true,
    open: false,
  },
});
