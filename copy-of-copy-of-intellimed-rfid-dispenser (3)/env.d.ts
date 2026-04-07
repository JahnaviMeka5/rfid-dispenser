// env.d.ts
declare global {
  interface ImportMetaEnv {
    readonly VITE_API_BASE?: string;
    // add other env variables here if you later need them
  }
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}
export {};

