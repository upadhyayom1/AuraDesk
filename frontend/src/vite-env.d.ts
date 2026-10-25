/// <reference types="vite/client" />

interface Window {
  api?: {
    platform?: string;
    invoke: (channel: string, payload?: any) => Promise<any>;
    on: (channel: string, callback: (...args: any[]) => void) => () => void;
    window?: {
      close: () => Promise<any>;
      minimize: () => Promise<any>;
      toggleMaximize: () => Promise<any>;
      isMaximized: () => Promise<any>;
    };
    discovery?: {
      search: (params: any) => Promise<any>;
      browse: (params?: any) => Promise<any>;
      get: (wallpaperId: string) => Promise<any>;
      credits: (wallpaperId: string) => Promise<any>;
      sources: () => Promise<any>;
    };
  };
}
