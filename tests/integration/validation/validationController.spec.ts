import jsLogger from '@map-colonies/js-logger';
import mockAxios from 'jest-mock-axios';
import { trace } from '@opentelemetry/api';
import httpStatusCodes, { StatusCodes } from 'http-status-codes';
import { getApp } from '../../../src/app';
import { SERVICES } from '../../../src/common/constants';
import { ILookupOption } from '../../../src/externalServices/lookupTables/interfaces';
import { createFakeIngestionPayload, createFakeUpdatePayload, createUuid } from '../../helpers/helpers';
import { AppError } from '../../../src/common/appError';
import { ValidationRequestSender } from './helpers/requestSender';

describe('ValidationController', function () {
  let requestSender: ValidationRequestSender;
  beforeEach(function () {
    const app = getApp({
      override: [
        { token: SERVICES.LOGGER, provider: { useValue: jsLogger({ enabled: false }) } },
        { token: SERVICES.TRACER, provider: { useValue: trace.getTracer('testTracer') } },
      ],
      useChild: true,
    });
    requestSender = new ValidationRequestSender(app);
  });

  afterEach(function () {
    mockAxios.reset();
  });
  describe('POST /ingestion', function () {
    describe('Happy Path 🙂', function () {
      it(`should return 200 status code and 'true' if payload is valid`, async function () {
        const payload = createFakeIngestionPayload();
        mockAxios.get.mockResolvedValueOnce({ data: [{ value: payload.metadata.classification }] as ILookupOption[] });
        mockAxios.get.mockResolvedValueOnce({ status: StatusCodes.OK });
        
        const response = await requestSender.ingestion(payload);
        
        expect(response.status).toBe(httpStatusCodes.OK);
        expect(response.body).toHaveProperty('isValidated', true);
      });

      it(`should return 200 status code, 'false' and message if payload is not valid`, async function () {
        const payload = createFakeIngestionPayload();
        mockAxios.get.mockResolvedValueOnce({ data: [{ value: payload.metadata.classification }] as ILookupOption[] });
        mockAxios.get.mockResolvedValueOnce({ status: StatusCodes.NOT_FOUND });
        
        const response = await requestSender.ingestion(payload);
        
        expect(response.status).toBe(httpStatusCodes.OK);
        expect(response.body).toHaveProperty('isValidated', false);
        expect(response.body).toHaveProperty('reason', `Record with productId: ${payload.metadata.productId} doesn't exist!`);
      });
    });
    describe('Bad Path 😡', function () {
      // All requests with status code of 400
    });
    describe('Sad Path 😥', function () {
      it(`should return 500 status code if one of the external services is not working properly`, async function () {
        const payload = createFakeIngestionPayload();
        mockAxios.get.mockResolvedValueOnce({ data: [{ value: payload.metadata.classification }] as ILookupOption[] });
        mockAxios.get.mockRejectedValueOnce(new AppError('error', StatusCodes.INTERNAL_SERVER_ERROR, 'catalog error', true));
        
        const response = await requestSender.ingestion(payload);
        
        expect(response.status).toBe(httpStatusCodes.INTERNAL_SERVER_ERROR);
        expect(response.body).toHaveProperty('message', 'catalog error');
      });
    });
  });
  describe('POST /update/{identifier}', function () {
    describe('Happy Path 🙂', function () {
      it(`should return 200 status code and 'true' if payload is valid`, async function () {
        const identifier = createUuid();
        const payload = createFakeUpdatePayload();
        mockAxios.get.mockResolvedValueOnce({ status: StatusCodes.OK });
        mockAxios.get.mockResolvedValueOnce({ data: [{ value: payload.classification }] as ILookupOption[] });
        
        const response = await requestSender.update(identifier, payload);
        
        expect(response.status).toBe(httpStatusCodes.OK);
        expect(response.body).toHaveProperty('isValidated', true);
      });

      it(`should return 200 status code, 'false' and message if payload is not valid`, async function () {
        const identifier = createUuid();
        const payload = createFakeUpdatePayload();
        mockAxios.get.mockResolvedValueOnce({ status: StatusCodes.NOT_FOUND });
        mockAxios.get.mockResolvedValueOnce({ data: [{ value: payload.classification }] as ILookupOption[] });
        
        const response = await requestSender.update(identifier, payload);
        
        expect(response.status).toBe(httpStatusCodes.OK);
        expect(response.body).toHaveProperty('isValidated', false);
        expect(response.body).toHaveProperty('reason', `Record with identifier: ${identifier} doesn't exist!`);
      });
    });
    describe('Bad Path 😡', function () {
      // All requests with status code of 400
    });
    describe('Sad Path 😥', function () {
      it(`should return 500 status code if one of the external services is not working properly`, async function () {
        const identifier = createUuid();
        const payload = createFakeUpdatePayload();
        mockAxios.get.mockRejectedValueOnce(new AppError('error', StatusCodes.INTERNAL_SERVER_ERROR, 'catalog error', true));
        mockAxios.get.mockResolvedValueOnce({ data: [{ value: payload.classification }] as ILookupOption[] });
        
        const response = await requestSender.update(identifier, payload);
        
        expect(response.status).toBe(httpStatusCodes.INTERNAL_SERVER_ERROR);
        expect(response.body).toHaveProperty('message', 'Problem with the catalog during validation of record existence');
      });
    });
  });
});
