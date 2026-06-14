/// <reference types="vite/client" />
interface ImportMetaEnv { readonly VITE_AUTH0_DOMAIN: string; readonly VITE_AUTH0_CLIENT_ID: string; readonly VITE_AUTH0_AUDIENCE: string; readonly VITE_STRIPE_PUBLISHABLE_KEY: string; readonly VITE_AGORA_APP_ID: string; }
interface ImportMeta { readonly env: ImportMetaEnv; }
