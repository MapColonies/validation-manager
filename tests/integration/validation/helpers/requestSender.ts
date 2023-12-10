import * as supertest from 'supertest';
import { IngestionPayload, UpdatePayload } from '../../../../src/common/interfaces';

export class ValidationRequestSender {
  public constructor(private readonly app: Express.Application) {}

  public async ingestion(payload: IngestionPayload): Promise<supertest.Response> {
    return supertest.agent(this.app).post('/ingestion').set('Content-Type', 'application/json').send(payload);
  }

  public async update(identifier: string, payload: UpdatePayload): Promise<supertest.Response> {
    return supertest.agent(this.app).post(`/update/${identifier}`).set('Content-Type', 'application/json').send(payload);
  }
}
