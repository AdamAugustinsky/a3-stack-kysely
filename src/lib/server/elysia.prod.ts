import { auth } from './auth';
import { db } from './db';
import { createElysiaApp } from './elysia';

export const app = createElysiaApp(db, auth);
