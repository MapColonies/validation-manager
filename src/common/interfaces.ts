import { Layer3DMetadata } from "@map-colonies/mc-model-types";

export interface IConfig {
  get: <T>(setting: string) => T;
  has: (setting: string) => boolean;
}

export interface OpenApiConfig {
  filePath: string;
  basePath: string;
  jsonPath: string;
  uiPath: string;
}

export interface BoundingVolume {
  sphere?: number[];
  region?: number[];
  box?: number[];
}

export interface Root {
  boundingVolume: BoundingVolume;
}

export interface TileSetJson {
  root: Root;
}

export interface BoundingSphere {
  sphere: number[];
}

export interface BoundingRegion {
  region: number[];
}

export interface ValidationResponse {
  isValidated: boolean;
  reason?: string;
}

export interface RequestParams {
  identifier: string;
}

export interface IngestionPayload {
  modelPath: string;
  tilesetFilename: string;
  metadata: Omit<Layer3DMetadata, 'productSource'>;
}

export interface UpdatePayload {
  productName?: string;
  description?: string;
  creationDate?: Date;
  minResolutionMeter?: number;
  maxResolutionMeter?: number;
  maxAccuracyCE90?: number;
  absoluteAccuracyLE90?: number;
  accuracySE90?: number;
  relativeAccuracySE90?: number;
  visualAccuracy?: number;
  heightRangeFrom?: number;
  heightRangeTo?: number;
  classification?: string;
  producerName?: string;
  minFlightAlt?: number;
  maxFlightAlt?: number;
  geographicArea?: string;
  keywords?: string;
}
