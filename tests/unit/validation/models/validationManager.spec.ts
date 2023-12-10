import config from 'config';
import jsLogger from '@map-colonies/js-logger';
import { Polygon } from 'geojson';
import { StatusCodes } from 'http-status-codes';
import { ProductType } from '@map-colonies/mc-model-types';
import { randWord } from '@ngneat/falso';
import { ValidationManager } from '../../../../src/validation/models/validationManager';
import { IngestionPayload } from '../../../../src/common/interfaces';
import {
  createMetadata,
  createModelPath,
  createTilesetFileName,
  createWrongModelPath,
  createWrongFootprintCoordinates,
  createFootprint,
  createWrongFootprintSchema,
  createInvalidTileset,
  createUuid,
  createFakeUpdatePayload,
  createFakeIngestionPayload,
} from '../../../helpers/helpers';
import { configMock, lookupTablesMock, catalogMock, jsLoggerMock } from '../../../helpers/mockCreator';
import { AppError } from '../../../../src/common/appError';

describe('ValidationManager', () => {
  let validationManager: ValidationManager;

  beforeEach(() => {
    validationManager = new ValidationManager(config, jsLogger({ enabled: false }), lookupTablesMock as never, catalogMock as never);
  });
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateModelName tests', () => {
    it('returns true when got valid model name', () => {
      const modelPath = createModelPath('/Sphere');

      const response = validationManager['validateModelName'](modelPath);

      expect(response).toBe(true);
    });

    it('returns error string when got model name that is not in the agreed folder', () => {
      const modelPath = createWrongModelPath();

      const response = validationManager['validateModelName'](modelPath);

      expect(response).toBe(`Unknown model name! The model name isn't in the folder!, modelPath: ${modelPath}`);
    });
  });

  describe('validateTilesetJson tests', () => {
    it('returns true when the file in tilesetFilename exists is a valid JSON', () => {
      const payload: IngestionPayload = {
        modelPath: createModelPath('/Sphere'),
        tilesetFilename: createTilesetFileName(),
        metadata: createMetadata(),
      };

      const response = validationManager['validateTilesetJson'](payload.modelPath, payload.tilesetFilename);

      expect(response).toBe(true);
    });

    it('returns error string when the file in tilesetFilename does not exists', () => {
      const payload: IngestionPayload = {
        modelPath: createModelPath('/Sphere'),
        tilesetFilename: 'file.json',
        metadata: createMetadata(),
      };

      const response = validationManager['validateTilesetJson'](payload.modelPath, payload.tilesetFilename);

      expect(response).toBe(`Unknown tileset name! The tileset file wasn't found!, tileset: ${payload.tilesetFilename} doesn't exist`);
    });

    it('returns error string when the file is not a valid JSON', () => {
      const payload: IngestionPayload = {
        modelPath: createModelPath('/Sphere'),
        tilesetFilename: createInvalidTileset(),
        metadata: createMetadata(),
      };
      const response = validationManager['validateTilesetJson'](payload.modelPath, payload.tilesetFilename);

      expect(response).toBe(`${payload.tilesetFilename} file that was provided isn't in a valid json format!`);
    });
  });

  describe('validateFootprint tests', () => {
    it('returns true when the footPrint is valid and the first and last coordinate are equal', () => {
      const footprint = createFootprint();

      const response = validationManager['validateFootprint'](footprint);

      expect(response).toBe(true);
    });

    it('returns error string when the footPrint is invalid', () => {
      const footprint: unknown = createWrongFootprintSchema();

      const response = validationManager['validateFootprint'](footprint as Polygon);
      expect(response).toBe(
        `Invalid footprint provided. Must be in a GeoJson format of a Polygon. Should contain "type" and "coordinates" only. footprint: ${JSON.stringify(
          footprint
        )}`
      );
    });

    it('returns false when the first and last coordinate are different', () => {
      const footprint = createWrongFootprintCoordinates();

      const response = validationManager['validateFootprint'](footprint);

      expect(response).toBe(`Wrong footprint: ${JSON.stringify(footprint)} the first and last coordinates should be equal`);
    });
  });

  describe('validateProductType tests', () => {
    it('returns true without warnings when got valid productType', () => {
      validationManager = new ValidationManager(config, jsLoggerMock as never, lookupTablesMock as never, catalogMock as never);
      const modelName = createModelPath('/Sphere');
      const productType = ProductType.PHOTO_REALISTIC_3D;

      const response = validationManager['validateProductType'](productType, modelName);

      expect(response).toBe(true);
      expect(jsLoggerMock.warn).not.toHaveBeenCalled();
    });

    it('returns true with warnings when got invalid productType', () => {
      validationManager = new ValidationManager(config, jsLoggerMock as never, lookupTablesMock as never, catalogMock as never);
      const modelName = createModelPath('/Sphere');
      const productType = ProductType.DSM;
      jsLoggerMock.warn.mockReturnValue('');

      const response = validationManager['validateProductType'](productType, modelName);

      expect(response).toBe(true);
      expect(jsLoggerMock.warn).toHaveBeenCalled();
    });
  });

  describe('validateIntersection tests', () => {
    it('throws error when something went wrong during the intersection', () => {
      const payload: IngestionPayload = {
        modelPath: createModelPath('/Sphere'),
        tilesetFilename: createInvalidTileset(),
        metadata: createMetadata(),
      };

      const response = () => {
        validationManager['validateIntersection'](payload);
      };

      expect(response).toThrow(AppError);
    });

    describe('test tileset as sphere', () => {
      it('returns true when footprint is close to tileset json', () => {
        const payload: IngestionPayload = {
          modelPath: createModelPath('/Sphere'),
          tilesetFilename: createTilesetFileName(),
          metadata: createMetadata(),
        };

        const response = validationManager['validateIntersection'](payload);

        expect(response).toBe(true);
      });

      it('returns error string when footprint is not intersect to tileset json file', () => {
        const payload: IngestionPayload = {
          modelPath: createModelPath('/Sphere'),
          tilesetFilename: createTilesetFileName(),
          metadata: createMetadata(),
        };
        payload.metadata.footprint = createFootprint('Region');

        const response = validationManager['validateIntersection'](payload);

        expect(response).toBe(`Wrong footprint! footprint's coordinates is not even close to the model!`);
      });
    });

    describe('test tileset as region', () => {
      it('returns true when footprint is close to tileset json', () => {
        const payload: IngestionPayload = {
          modelPath: createModelPath('/Region'),
          tilesetFilename: createTilesetFileName(),
          metadata: createMetadata(),
        };
        payload.metadata.footprint = createFootprint('Region');

        const response = validationManager['validateIntersection'](payload);

        expect(response).toBe(true);
      });

      it('returns error string when footprint is not intersect to tileset json file', () => {
        const payload: IngestionPayload = {
          modelPath: createModelPath('/Region'),
          tilesetFilename: createTilesetFileName(),
          metadata: createMetadata(),
        };
        payload.metadata.footprint = createWrongFootprintCoordinates();

        const response = validationManager['validateIntersection'](payload);

        expect(response).toBe(`Wrong footprint! footprint's coordinates is not even close to the model!`);
      });
    });
    it('returns error string when tileset is a BoundingVolume of Box', () => {
      const payload: IngestionPayload = {
        modelPath: createModelPath('/Box'),
        tilesetFilename: createTilesetFileName(),
        metadata: createMetadata(),
      };
      payload.metadata.footprint = createWrongFootprintCoordinates();

      const response = validationManager['validateIntersection'](payload);

      expect(response).toBe(`BoundingVolume of box is not supported yet... Please contact 3D team.`);
    });
    it('returns error string when tileset is in wrong BoundingVolume', () => {
      const payload: IngestionPayload = {
        modelPath: createModelPath('/WrongVolume'),
        tilesetFilename: createTilesetFileName(),
        metadata: createMetadata(),
      };
      payload.metadata.footprint = createWrongFootprintCoordinates();

      const response = validationManager['validateIntersection'](payload);

      expect(response).toBe(`Bad tileset format. Should be in 3DTiles format`);
    });

    it('returns false when footprint is not intersected enough with tileset json', () => {
      const payload: IngestionPayload = {
        modelPath: createModelPath('/Sphere'),
        tilesetFilename: createTilesetFileName(),
        metadata: createMetadata(),
      };
      configMock.get.mockReturnValue(100);
      validationManager = new ValidationManager(configMock, jsLogger({ enabled: false }), lookupTablesMock as never, catalogMock as never);

      const response = validationManager['validateIntersection'](payload);

      expect(response).toContain('The footprint is not intersected enough with the model');
    });
  });

  describe('validateDates tests', () => {
    it('returns true when start date is earlier than end date', () => {
      const startDate = new Date(2021, 11, 12, 7);
      const endDate = new Date(2022, 11, 12, 8);

      const response = validationManager['validateDates'](startDate, endDate);

      expect(response).toBe(true);
    });

    it('returns false when end date is earlier than start date', () => {
      const startDate = new Date(2022, 11, 12, 8);
      const endDate = new Date(2022, 11, 12, 7);

      const response = validationManager['validateDates'](startDate, endDate);

      expect(response).toBe('sourceStartDate should not be later than sourceEndDate');
    });
  });

  describe('validateResolutionMeter tests', () => {
    it('returns true when one of them is undefined', () => {
      const minResolutionMeter = 1;
      const maxResolutionMeter = undefined;

      const response = validationManager['validateResolutionMeter'](minResolutionMeter, maxResolutionMeter);

      expect(response).toBe(true);
    });

    it('returns true when minResolutionMeter is smaller than maxResolutionMeter', () => {
      const minResolutionMeter = 1;
      const maxResolutionMeter = 2;

      const response = validationManager['validateResolutionMeter'](minResolutionMeter, maxResolutionMeter);

      expect(response).toBe(true);
    });

    it('returns false when minResolutionMeter is bigger than maxResolutionMeter', () => {
      const minResolutionMeter = 2;
      const maxResolutionMeter = 1;

      const response = validationManager['validateResolutionMeter'](minResolutionMeter, maxResolutionMeter);

      expect(response).toBe('minResolutionMeter should not be bigger than maxResolutionMeter');
    });
  });

  describe('validateClassification tests', () => {
    it('returns true when classification exists in lookup-tables', async () => {
      const classification = '1';
      lookupTablesMock.getClassifications.mockResolvedValue(['1']);

      const response = await validationManager['validateClassification'](classification);

      expect(response).toBe(true);
    });

    it('returns false when classification does not exist in lookup-tables', async () => {
      const classification = '1';
      const optionalClassifications = ['2', '3'];
      lookupTablesMock.getClassifications.mockResolvedValue(optionalClassifications);

      const response = await validationManager['validateClassification'](classification);

      expect(response).toBe(`classification is not a valid value.. Optional values: ${optionalClassifications.join()}`);
    });

    it('throws error when there is an error in lookup-tables', async () => {
      const classification = '2';
      lookupTablesMock.getClassifications.mockRejectedValue(new Error('lookup-tables service is not available'));

      const response = async () => {
        await validationManager['validateClassification'](classification);
      };

      await expect(response).rejects.toThrow(Error('lookup-tables service is not available'));
    });
  });

  describe('validateRecordExistence tests', () => {
    it('returns true when identifier exists in catalog', async () => {
      const identifier = createUuid();
      catalogMock.isRecordExist.mockResolvedValue(true);

      const response = await validationManager['validateRecordExistence'](identifier);

      expect(response).toBe(true);
    });

    it('returns false when identifier does not exist in catalog', async () => {
      const identifier = createUuid();
      catalogMock.isRecordExist.mockResolvedValue(false);

      const response = await validationManager['validateRecordExistence'](identifier);

      expect(response).toBe(`Record with identifier: ${identifier} doesn't exist!`);
    });

    it('throws error when there is an error in catalog', async () => {
      const identifier = createUuid();
      catalogMock.isRecordExist.mockRejectedValue(new Error('catalog service is not available'));

      const response = async () => {
        await validationManager['validateRecordExistence'](identifier);
      };

      await expect(response).rejects.toThrow(Error('catalog service is not available'));
    });
  });

  describe('validateProductID tests', () => {
    it('returns true when productId exists in catalog', async () => {
      const identifier = createUuid();
      catalogMock.isProductIdExist.mockResolvedValue(true);

      const response = await validationManager['validateProductID'](identifier);

      expect(response).toBe(true);
    });

    it('returns false when productId does not exist in catalog', async () => {
      const identifier = createUuid();
      catalogMock.isProductIdExist.mockResolvedValue(false);

      const response = await validationManager['validateProductID'](identifier);

      expect(response).toBe(`Record with productId: ${identifier} doesn't exist!`);
    });

    it('throws error when there is an error in catalog', async () => {
      const identifier = createUuid();
      catalogMock.isProductIdExist.mockRejectedValue(new Error('catalog service is not available'));

      const response = async () => {
        await validationManager['validateProductID'](identifier);
      };

      await expect(response).rejects.toThrow(Error('catalog service is not available'));
    });
  });

  describe('validateIngestion', () => {
    it('returns true when got all functions valid', async () => {
      const payload: IngestionPayload = {
        modelPath: createModelPath('/Sphere'),
        tilesetFilename: createTilesetFileName(),
        metadata: createMetadata(),
      };
      lookupTablesMock.getClassifications.mockResolvedValue([payload.metadata.classification]);
      catalogMock.isProductIdExist.mockResolvedValue([payload.metadata.productId]);

      const response = await validationManager.validateIngestion(payload);

      expect(response.isValidated).toBe(true);
    });

    it('returns true when got unfamiliar ProductType', async () => {
      const payload: IngestionPayload = {
        modelPath: createModelPath('/Sphere'),
        tilesetFilename: createTilesetFileName(),
        metadata: createMetadata(),
      };
      payload.metadata.productType = ProductType.ORTHOPHOTO;
      lookupTablesMock.getClassifications.mockResolvedValue([payload.metadata.classification]);
      catalogMock.isProductIdExist.mockResolvedValue([payload.metadata.productId]);

      const response = await validationManager.validateIngestion(payload);

      expect(response.isValidated).toBe(true);
    });

    it('returns error string when has one invalid function', async () => {
      const payload: IngestionPayload = {
        modelPath: createWrongModelPath(),
        tilesetFilename: createTilesetFileName(),
        metadata: createMetadata(),
      };

      const response = await validationManager.validateIngestion(payload);

      expect(response.isValidated).toBe(false);
    });

    it('throws error when one of the external services does not properly responded', async () => {
      const payload = createFakeIngestionPayload();
      lookupTablesMock.getClassifications.mockRejectedValue(new AppError('error', StatusCodes.INTERNAL_SERVER_ERROR, 'lookup-tables error', true));

      const response = validationManager.validateIngestion(payload);

      await expect(response).rejects.toThrow('lookup-tables error');
    });
  });

  describe('validateUpdate', () => {
    it('returns true when got all functions valid', async () => {
      const identifier = createUuid();
      const payload = createFakeUpdatePayload();
      lookupTablesMock.getClassifications.mockResolvedValue([payload.classification]);
      catalogMock.isRecordExist.mockResolvedValue([identifier]);

      const response = await validationManager.validateUpdate(identifier, payload);

      expect(response.isValidated).toBe(true);
    });

    it('returns error string when has one invalid function', async () => {
      const identifier = createUuid();
      const payload = createFakeUpdatePayload();
      lookupTablesMock.getClassifications.mockResolvedValue([randWord()]);

      const response = await validationManager.validateUpdate(identifier, payload);

      expect(response.isValidated).toBe(false);
    });

    it('throws error when one of the external services does not properly responded', async () => {
      const identifier = createUuid();
      const payload = createFakeUpdatePayload();
      catalogMock.isRecordExist.mockRejectedValue(new AppError('error', StatusCodes.INTERNAL_SERVER_ERROR, 'catalog error', true));

      const response = validationManager.validateUpdate(identifier, payload);

      await expect(response).rejects.toThrow('catalog error');
    });
  });
});
