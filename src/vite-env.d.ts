/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PB_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare namespace JSX {
  interface IntrinsicElements {
    'full-calendar': {
      ref?: HTMLElement | ((el: HTMLElement) => void);
      shadow?: boolean | string;
    };
  }
}
