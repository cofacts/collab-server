import 'dotenv/config';

jest.setTimeout((process.env.JEST_TIMEOUT as unknown as number) || 5000);
