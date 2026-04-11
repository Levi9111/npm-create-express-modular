import { Router } from 'express';

// --- INJECT IMPORTS HERE ---

const router = Router();

const moduleRoutes: any = [
  // --- INJECT ROUTES HERE ---
];

moduleRoutes.forEach((route: any) => router.use(route.path, route.route));

export default router;
