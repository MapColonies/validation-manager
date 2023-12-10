import * as fs from 'fs';
import config from 'config';
import { randBetweenDate, randNumber, randPastDate, randSentence, randUuid, randWord } from '@ngneat/falso';
import { Polygon } from 'geojson';
import { Layer3DMetadata, ProductType, RecordStatus, RecordType } from '@map-colonies/mc-model-types';
import { ILookupOption } from '../../src/externalServices/lookupTables/interfaces';
import { IngestionPayload, UpdatePayload } from '../../src/common/interfaces';

const maxResolutionMeter = 8000;
const noData = 999;
const maxAccuracySE90 = 250;
const maxAccuracy = 100;
const minX = 1;
const minY = 2;
const maxX = 3;
const maxY = 4;
const pvPath = config.get<string>('paths.pvPath');

export const createWrongFootprintCoordinates = (): Polygon => {
  return {
    type: 'Polygon',
    coordinates: [
      [
        [minX, minY],
        [maxX, minY],
        [maxX, maxY],
        [minX, maxY],
      ],
    ],
  };
};

export const createWrongFootprintSchema = (): unknown => {
  return {
    type: 'Polygon',
    coordinates: [
      [
        [minX, minY],
        [maxX, 'hello'],
        [maxX, maxY],
        [minX, maxY],
      ],
    ],
  };
};

export const createUuid = (): string => {
  return randUuid();
};

export const createModelPath = (modelName: string): string => {
  return `${pvPath}/${modelName}`;
};

export const createWrongModelPath = (): string => {
  return pvPath + '/BlaBla';
};

export const createTilesetFileName = (): string => {
  return 'tileset.json';
};

export const createInvalidTileset = (): string => {
  return 'invalidTileset.json';
};

export const createFootprint = (type = 'Sphere'): Polygon => {
  const jsonString: string = fs.readFileSync(`${pvPath}/${type}/footprint.json`, 'utf8');
  return JSON.parse(jsonString) as Polygon;
};

export const createMetadata = (type = 'Sphere'): Omit<Layer3DMetadata, 'productSource'> => {
  const sourceDateStart = randPastDate();
  const sourceDateEnd = randBetweenDate({ from: sourceDateStart, to: new Date() });
  const minResolutionMeter = randNumber({ max: maxResolutionMeter });
  return {
    productId: randUuid(),
    productName: randWord(),
    productType: ProductType.PHOTO_REALISTIC_3D,
    description: randSentence(),
    creationDate: randPastDate(),
    sourceDateStart: sourceDateStart,
    sourceDateEnd: sourceDateEnd,
    minResolutionMeter: minResolutionMeter,
    maxResolutionMeter: randNumber({ min: minResolutionMeter, max: maxResolutionMeter }),
    maxAccuracyCE90: randNumber({ min: 0, max: noData }),
    absoluteAccuracyLE90: randNumber({ min: 0, max: noData }),
    accuracySE90: randNumber({ min: 0, max: maxAccuracySE90 }),
    relativeAccuracySE90: randNumber({ min: 0, max: maxAccuracy }),
    visualAccuracy: randNumber({ min: 0, max: maxAccuracy }),
    sensors: [randWord()],
    footprint: createFootprint(type),
    heightRangeFrom: randNumber(),
    heightRangeTo: randNumber(),
    srsId: randNumber().toString(),
    srsName: randWord(),
    region: [randWord()],
    classification: randWord(),
    productionSystem: randWord(),
    productionSystemVer: randWord(),
    producerName: randWord(),
    minFlightAlt: randNumber(),
    maxFlightAlt: randNumber(),
    geographicArea: randWord(),
    productStatus: RecordStatus.UNPUBLISHED,
    productBoundingBox: undefined,
    productVersion: undefined,
    type: RecordType.RECORD_3D,
    updateDate: undefined,
  };
};

export const createInvalidMetadata = (): Layer3DMetadata => {
  return {
    ...createMetadata(),
    footprint: 1,
  } as unknown as Layer3DMetadata;
};

export const createFakeIngestionPayload = (modelName = 'Sphere'): IngestionPayload => {
  return {
    modelPath: createModelPath(modelName),
    tilesetFilename: createTilesetFileName(),
    metadata: createMetadata(),
  };
};

export const createLookupOptions = (amount = randNumber({ min: 1, max: 3 })): ILookupOption[] => {
  const lookupOptions: ILookupOption[] = [];
  for (let i = 0; i < amount; i++) {
    lookupOptions.push(createLookupOption());
  }
  return lookupOptions;
};

export const createLookupOption = (): ILookupOption => {
  return {
    value: randWord(),
    translationCode: randWord(),
  };
};

export const createFakeUpdatePayload = (): Partial<UpdatePayload> => {
  const minResolutionMeter = randNumber({ max: maxResolutionMeter });
  const payload: UpdatePayload = {
    productName: randWord(),
    description: randWord(),
    creationDate: randPastDate(),
    classification: randWord(),
    minResolutionMeter: minResolutionMeter,
    maxResolutionMeter: randNumber({ min: minResolutionMeter, max: maxResolutionMeter }),
    maxAccuracyCE90: randNumber({ max: noData }),
    absoluteAccuracyLE90: randNumber({ max: noData }),
    accuracySE90: randNumber({ max: maxAccuracySE90 }),
    relativeAccuracySE90: randNumber({ max: maxAccuracy }),
    visualAccuracy: randNumber({ max: maxAccuracy }),
    heightRangeFrom: randNumber(),
    heightRangeTo: randNumber(),
    producerName: randWord(),
    minFlightAlt: randNumber(),
    maxFlightAlt: randNumber(),
    geographicArea: randWord(),
  };
  return payload;
}