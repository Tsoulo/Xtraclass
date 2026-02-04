/**
 * File Storage Module
 * Provides abstraction for both local and R2 file storage
 */

export { getStorage, setStorage, initializeStorage, LocalStorage } from "./storage-adapter";
export type { IStorage } from "./storage-adapter";
export { R2Storage, initializeR2Storage } from "./r2-storage";
