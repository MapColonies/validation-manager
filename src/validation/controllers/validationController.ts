import { Logger } from '@map-colonies/js-logger';
import { BoundCounter, Meter } from '@opentelemetry/api-metrics';
import { RequestHandler } from 'express';
import httpStatus from 'http-status-codes';
import { injectable, inject } from 'tsyringe';
import { SERVICES } from '../../common/constants';
import { IngestionPayload, RequestParams, UpdatePayload, ValidationResponse } from '../../common/interfaces';

import { ValidationManager } from '../models/validationManager';

type IngestionHandler = RequestHandler<undefined, ValidationResponse, IngestionPayload>;
type UpdateHandler = RequestHandler<RequestParams, ValidationResponse, UpdatePayload>;

@injectable()
export class ValidationController {
  private readonly createdResourceCounter: BoundCounter;

  public constructor(
    @inject(SERVICES.LOGGER) private readonly logger: Logger,
    @inject(ValidationManager) private readonly manager: ValidationManager,
    @inject(SERVICES.METER) private readonly meter: Meter,
    ) {
    this.createdResourceCounter = meter.createCounter('created_validation');
  }

  public ingestion: IngestionHandler = async (req, res, next) => {
    const payload = req.body;
      try {
        return res.status(httpStatus.OK).json(await this.manager.validateIngestion(payload));
      } catch(error) {
        this.logger.error({ msg: `Failed validating the ingestion payload!`, error, modelName: req.body.metadata.productName });
        return next(error);      
      }
  };

  public update: UpdateHandler = async (req, res, next) => {
    const { identifier } = req.params;
    const payload = req.body;
    try {
      return res.status(httpStatus.OK).json(await this.manager.validateUpdate(identifier, payload));
    } catch(error) {
      this.logger.error({ msg: `Failed validating the update payload!`, error, identifier });
      return next(error);
    };
  }
}
