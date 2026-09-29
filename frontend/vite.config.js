import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// VITE_API_BASE is inlined into the bundle at build time. Unset, the frontend
// falls back to http://localhost:8000/api, so a deployed build makes every
// visitor's browser call their own localhost and every card fails -- silently,
// at runtime, on someone else's machine. Say so where it is still readable.
// (This reads the real environment, not .env, which is deliberate: the case
// that hurts is CI, where .env is absent by definition.)
if (!process.env.VITE_API_BASE) {
  console.warn(
    '[vite] VITE_API_BASE is not set; the bundle will point at ' +
      'http://localhost:8000/api. Expected for local dev. A Vercel or Docker ' +
      'build must set it to the API origin or the deployed site is broken.',
  )
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
})
