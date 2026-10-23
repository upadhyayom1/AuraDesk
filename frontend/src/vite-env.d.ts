/// <reference types="vite/client" />

interface Window {
  api?: {
    invoke: (channel: string, payload?: any) => Promise<any>;
    on: (channel: string, callback: (...args: any[]) => void) => () => void;
  };
}
