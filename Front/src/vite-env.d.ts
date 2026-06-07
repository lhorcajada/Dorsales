/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_APP_NAME?: string;
  readonly VITE_CONTEST_START_AT?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_DEV_AUTH_MOCK?: string;
  readonly VITE_DEV_ADMIN_EMAIL?: string;
  readonly VITE_DEV_ADMIN_PASSWORD?: string;
  readonly VITE_DEV_ADMIN_NAME?: string;
  readonly VITE_DEV_ADMIN_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}