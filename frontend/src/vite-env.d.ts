/// <reference types="vite/client" />

interface Window {
  api?: {
    invoke: (channel: string, payload?: any) => Promise<any>;
    on: (channel: string, callback: (...args: any[]) => void) => () => void;
    discovery?: {
      search: (params: any) => Promise<any>;
      browse: (params?: any) => Promise<any>;
      get: (wallpaperId: string) => Promise<any>;
      credits: (wallpaperId: string) => Promise<any>;
      sources: () => Promise<any>;
    };
  };
}
