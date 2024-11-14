import { Router } from 'express';
import { AdvertiserRoutes } from './AdvertiserRoutes';
import { CampaignRoutes } from './CampaignRoutes';
import { FilterRoutes } from './FilterRoutes';
import { GeoTargetRoutes } from './GeoTargetRoutes';

export const configureRoutes = () => {
  // create router instance
  const router = Router();

  // configure routes
  new AdvertiserRoutes(router).configureRoutes();
  new CampaignRoutes(router).configureRoutes();
  new FilterRoutes(router).configureRoutes();
  new GeoTargetRoutes(router).configureRoutes();

  return router;
};
