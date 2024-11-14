import { Router } from 'express';
import { configs } from '../config';
import { AdvertiserController } from '../controllers/AdvertiserController';
import { AdvertiserService } from '../services/advertiser/AdvertiserService';
import { AdvertiserServiceImpl } from '../services/advertiser/AdvertiserServiceImpl';
import { QpAdvertiserService } from '../services/qp-services/QpAdvertiserService';
import { validate } from '../validations';
import { advertiserValidations } from '../validations/advertiser.validation';

export class AdvertiserRoutes {
  private router: Router;
  private endpoint = '/advertiser';

  private advertiserController: AdvertiserController;

  constructor(router: Router) {
    this.router = router;

    // create qp advertiser service
    const qpAdvertiserService: QpAdvertiserService = new QpAdvertiserService(
      configs.QN_QP_BASE_URL,
      configs.QN_QP_API_TOKEN
    );

    // create advertiser service
    const advertiserService: AdvertiserService = new AdvertiserServiceImpl(
      configs.QN_QP_BASE_URL,
      configs.QN_QP_API_TOKEN
    );

    // create advertiser controller
    this.advertiserController = new AdvertiserController(advertiserService);
  }

  configureRoutes() {
    // create advertiser
    this.router.post(
      this.endpoint,
      validate(advertiserValidations.create),
      (req, res) => this.advertiserController.create(req, res)
    );

    // fetch advertiser
    this.router.get(
      this.endpoint,
      // validate(advertiserValidations.create),
      (req, res) => this.advertiserController.fetch(req, res)
    );

    // update advertiser
    this.router.put(
      `${this.endpoint}/:advertiserId`,
      validate(advertiserValidations.update),
      (req, res) => this.advertiserController.update(req, res)
    );

    // fetch advertiser by id
    this.router.get(
      `${this.endpoint}/:advertiserId`,
      validate(advertiserValidations.fetchById),
      (req, res) => this.advertiserController.fetchById(req, res)
    );

    // lookup advertiser by qp id
    this.router.get(
      `${this.endpoint}/lookup/:qpId`,
      validate(advertiserValidations.lookup),
      (req, res) => this.advertiserController.lookup(req, res)
    );
  }
}
