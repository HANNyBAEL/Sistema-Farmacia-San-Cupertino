/// <reference types="vite/client" />

declare module '*.css';
declare module '*.scss';
declare module '*.sass';
declare module '*.less';
declare module '*.module.css';
declare module '*.module.scss';
declare module '*.module.sass';

interface Window {
  grecaptcha?: {
    ready: (callback: () => void) => void;
    execute: (siteKey: string, options: { action: string }) => Promise<string>;
  };
}

// Types for import.meta.env
interface ImportMetaEnv {
  DEV?: boolean;
  // Add other environment variables as needed
}

interface ImportMeta {
  env: ImportMetaEnv;
}