// Asset model for storing asset information.

export interface Asset {
  assetId?: string;
  fileName?: string;
  fileType?: string;
  objectKey?: string;
  url?: string;
  usedInCount?: number;
}
