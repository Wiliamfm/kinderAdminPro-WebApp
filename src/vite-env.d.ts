/// <reference types="vite/client" />
/// <reference types="@solidjs/start/env" />

declare namespace JSX {
  interface IntrinsicElements {
    'full-calendar': {
      ref?: HTMLElement | ((el: HTMLElement) => void);
      shadow?: boolean | string;
    };
  }
}
