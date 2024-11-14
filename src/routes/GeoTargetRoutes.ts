import { Router } from 'express';
import { GeoTargetController } from '../controllers/GeoTargetController';
import { GeoTargetService } from '../services/geo-target/GeoTargetService';
import { GeoTargetServiceImpl } from '../services/geo-target/GeoTargetServiceImpl';
import { validate } from '../validations';
import { geoTargetValidations } from '../validations/geo-target.validation';

export class GeoTargetRoutes {
  private router: Router;
  private endpoint = '/geo-target';

  private geoTargetController: GeoTargetController;

  constructor(router: Router) {
    this.router = router;

    const geoTargetService: GeoTargetService = new GeoTargetServiceImpl();
    this.geoTargetController = new GeoTargetController(geoTargetService);
  }

  configureRoutes() {
    // fetch geo location list
    this.router.get(
      `${this.endpoint}/location-list`,
      validate(geoTargetValidations.geoLocationList),
      (req, res) => this.geoTargetController.geoLocationList(req, res)
    );

    return this.router;
  }
}
