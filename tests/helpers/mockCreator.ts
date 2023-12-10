export const storeTriggerMock = {
  createFlow: jest.fn(),
};

export const validationManagerMock = {
  validateAll: jest.fn(),
};

export const configMock = {
  get: jest.fn(),
  has: jest.fn(),
};

export const lookupTablesMock = {
  getClassifications: jest.fn(),
};

export const catalogMock = {
  isRecordExist: jest.fn(),
  isProductIdExist: jest.fn(),
};

export const jsLoggerMock = {
  warn: jest.fn(),
};
