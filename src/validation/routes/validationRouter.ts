import { Router } from 'express';
import { FactoryFunction } from 'tsyringe';
import { ValidationController } from '../controllers/validationController';

const validationRouterFactory: FactoryFunction<Router> = (dependencyContainer) => {
  const router = Router();
  const controller = dependencyContainer.resolve(ValidationController);

  router.post('/ingestion', controller.ingestion);
  router.post('/update/:identifier', controller.update);

  return router;
};

export const INGESTION_ROUTER_SYMBOL = Symbol('ingestionRouterFactory');

export { validationRouterFactory };
