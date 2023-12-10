import * as fs from 'fs';
import { Logger } from '@map-colonies/js-logger';
import { inject, injectable } from 'tsyringe';
import httpStatus from 'http-status-codes';
import { Feature, MultiPolygon, Polygon } from 'geojson';
import intersect from '@turf/intersect';
import union from '@turf/union';
import area from '@turf/area';
import Ajv from 'ajv';
import { ProductType } from '@map-colonies/mc-model-types';
import { AppError } from '../../common/appError';
import { SERVICES, footprintSchema } from '../../common/constants';
import { BoundingRegion, BoundingSphere, IConfig, IngestionPayload, TileSetJson, UpdatePayload, ValidationResponse } from '../../common/interfaces';
import { LookupTablesCall } from '../../externalServices/lookupTables/requestCall';
import { CatalogCall } from '../../externalServices/catalog/requestCall';
import * as polygonCalculations from './calculatePolygonFromTileset';

@injectable()
export class ValidationManager {
  public constructor(
    @inject(SERVICES.CONFIG) private readonly config: IConfig,
    @inject(SERVICES.LOGGER) private readonly logger: Logger,
    @inject(LookupTablesCall) private readonly lookupTables: LookupTablesCall,
    @inject(CatalogCall) private readonly catalog: CatalogCall
    ) {}

  public async validateIngestion(payload: IngestionPayload): Promise<ValidationResponse> {
    let result: boolean | string;
    this.logger.info({ msg: 'validating ingestion', modelName: payload.metadata.productName });

    result = this.validateModelName(payload.modelPath);
    if (typeof result == 'string') {
      return { isValidated: false, reason: result };
    }
    result = this.validateTilesetJson(payload.modelPath, payload.tilesetFilename);
    if (typeof result == 'string') {
      return { isValidated: false, reason: result };
    }
    result = this.validateDates(payload.metadata.sourceDateStart!, payload.metadata.sourceDateEnd!);
    if (typeof result == 'string') {
      return { isValidated: false, reason: result };
    }
    result = this.validateResolutionMeter(payload.metadata.minResolutionMeter, payload.metadata.maxResolutionMeter);
    if (typeof result == 'string') {
      return { isValidated: false, reason: result };
    }
    result = await this.validateClassification(payload.metadata.classification!);
    if (typeof result == 'string') {
      return { isValidated: false, reason: result };
    }
    result = this.validateFootprint(payload.metadata.footprint as Polygon);
    if (typeof result == 'string') {
      return { isValidated: false, reason: result };
    }
    result = this.validateProductType(payload.metadata.productType!, payload.metadata.productName!);
    if (typeof result == 'string') {
      return { isValidated: false, reason: result };
    }
    result = this.validateIntersection(payload);
    if (typeof result == 'string') {
      return { isValidated: false, reason: result };
    }
    if(payload.metadata.productId != undefined) {
      result = await this.validateProductID(payload.metadata.productId);
      if (typeof result == 'string') {
        return { isValidated: false, reason: result };
      }
    }

    return { isValidated: true };
  }

  public async validateUpdate(identifier: string, payload: UpdatePayload): Promise<ValidationResponse> {
    let result: boolean | string;
    this.logger.info({ msg: 'validating update', identifier });

    result = await this.validateRecordExistence(identifier);
    if (typeof result == 'string') {
      return { isValidated: false, reason: result };
    }

    if (payload.classification != undefined) {
      result = await this.validateClassification(payload.classification);
      if (typeof result == 'string') {
        return { isValidated: false, reason: result };
      }
    }
    return { isValidated: true };
  }

  private validateModelName(modelPath: string): boolean | string {
    if (fs.existsSync(`${modelPath}`)) {
      return true;
    }
    return `Unknown model name! The model name isn't in the folder!, modelPath: ${modelPath}`;
  }

  private validateTilesetJson(modelPath: string, tilesetFilename: string): boolean | string {
    if (!fs.existsSync(`${modelPath}/${tilesetFilename}`)) {
      return `Unknown tileset name! The tileset file wasn't found!, tileset: ${tilesetFilename} doesn't exist`;
    }
    const fileContent: string = fs.readFileSync(`${modelPath}/${tilesetFilename}`, 'utf-8');
    try {
      JSON.parse(fileContent);
    } catch (error) {
      return `${tilesetFilename} file that was provided isn't in a valid json format!`;
    }
    return true;
  }

  private validateFootprint(footprint: Polygon): boolean | string {
    if (!this.validatePolygonSchema(footprint)) {
      return `Invalid footprint provided. Must be in a GeoJson format of a Polygon. Should contain "type" and "coordinates" only. footprint: ${JSON.stringify(
        footprint
      )}`;
    }
    if (!this.validateCoordinates(footprint)) {
      return `Wrong footprint: ${JSON.stringify(footprint)} the first and last coordinates should be equal`;
    }
    return true;
  }

  // For now, the validation will be only warning.
  private validateProductType(productType: ProductType, modelName: string): boolean | string {
    if (productType != ProductType.PHOTO_REALISTIC_3D) {
      this.logger.warn({ msg: 'product type is not 3DPhotoRealistic. skipping intersection validation', modelName });
    }
    return true;
  }

  private validateIntersection(payload: IngestionPayload): boolean | string {
    const file: string = fs.readFileSync(`${payload.modelPath}/${payload.tilesetFilename}`, 'utf8');
    const footprint = payload.metadata.footprint as Polygon;
    const limit: number = this.config.get<number>('percentageLimit');
    let model: Polygon;

    try {
      this.logger.debug({ msg: 'extract polygon of the model', modelName: payload.metadata.productName });
      const shape = (JSON.parse(file) as TileSetJson).root.boundingVolume;

      if (shape.sphere != undefined) {
        model = polygonCalculations.convertSphereFromXYZToWGS84(shape as BoundingSphere);
      } else if (shape.region != undefined) {
        model = polygonCalculations.convertRegionFromRadianToDegrees(shape as BoundingRegion);
      } else if (shape.box != undefined) {
        return `BoundingVolume of box is not supported yet... Please contact 3D team.`;
      } else {
        return 'Bad tileset format. Should be in 3DTiles format';
      }

      this.logger.debug({ msg: 'extracted successfully polygon of the model', polygon: model, modelName: payload.metadata.productName });

      const intersection: Feature<Polygon | MultiPolygon> | null = intersect(footprint, model);

      this.logger.debug({
        msg: 'intersected successfully between footprint and polygon of the model',
        intersection,
        modelName: payload.metadata.productName,
      });

      if (intersection == null) {
        return `Wrong footprint! footprint's coordinates is not even close to the model!`;
      }

      const combined: Feature<Polygon | MultiPolygon> | null = union(footprint, model);

      this.logger.debug({ msg: 'combined successfully footprint and polygon of the model', combined, modelName: payload.metadata.productName });

      const areaFootprint = area(footprint);
      const areaCombined = area(combined!);
      this.logger.debug({
        msg: 'calculated successfully the areas',
        footprint: areaFootprint,
        combined: areaCombined,
        modelName: payload.metadata.productName,
      });
      // eslint-disable-next-line @typescript-eslint/no-magic-numbers
      const coveragePercentage = (100 * areaFootprint) / areaCombined;

      if (coveragePercentage < limit) {
        return `The footprint is not intersected enough with the model, the coverage is: ${coveragePercentage}% when the minimum coverage is ${limit}%`;
      }
      return true;
    } catch (error) {
      this.logger.error({
        msg: `An error caused during the validation of the intersection...`,
        modelName: payload.metadata.productName,
        error,
        payload,
      });
      throw new AppError('IntersectionError', httpStatus.INTERNAL_SERVER_ERROR, 'An error caused during the validation of the intersection', true);
    }
  }

  private validateDates(startDate: Date, endDate: Date): boolean | string {
    if (startDate <= endDate) {
      return true;
    }
    return 'sourceStartDate should not be later than sourceEndDate';
  }

  private validateResolutionMeter(minResolutionMeter: number | undefined, maxResolutionMeter: number | undefined): boolean | string {
    if (minResolutionMeter == undefined || maxResolutionMeter == undefined) {
      return true;
    }
    if (minResolutionMeter <= maxResolutionMeter) {
      return true;
    }
    return 'minResolutionMeter should not be bigger than maxResolutionMeter';
  }

  private async validateClassification(classification: string): Promise<boolean | string> {
    const classifications = await this.lookupTables.getClassifications();
    if (classifications.includes(classification)) {
      return true;
    }
    return `classification is not a valid value.. Optional values: ${classifications.join()}`;
  }

  private async validateRecordExistence(identifier: string): Promise<boolean | string> {
    return await this.catalog.isRecordExist(identifier) ? true : `Record with identifier: ${identifier} doesn't exist!`;
  }

  private validateCoordinates(footprint: Polygon): boolean {
    const length = footprint.coordinates[0].length;
    const first = footprint.coordinates[0][0];
    const last = footprint.coordinates[0][length - 1];
    return first[0] == last[0] && first[1] == last[1];
  }

  private validatePolygonSchema(footprint: Polygon): boolean {
    const ajv = new Ajv();
    const compiledSchema = ajv.compile(footprintSchema);
    const isPolygon = compiledSchema(footprint);
    return isPolygon;
  }

  private async validateProductID(productId: string): Promise<boolean | string> {
    return await this.catalog.isProductIdExist(productId) ? true : `Record with productId: ${productId} doesn't exist!`;
  }
}
