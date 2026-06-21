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
    getResponse: () => string;
    reset: () => void;
  };
}
