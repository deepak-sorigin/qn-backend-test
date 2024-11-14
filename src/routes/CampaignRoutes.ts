import { Router } from 'express';
import { configs } from '../config';
import { CampaignController } from '../controllers/CampaignController';
import { CampaignService } from '../services/campaign/CampaignService';
import { CampaignServiceImpl } from '../services/campaign/CampaignServiceImpl';
import { QpAdvertiserService } from '../services/qp-services/QpAdvertiserService';
import { QpCampaignService } from '../services/qp-services/QpCampaignService';
import { QpEditAssignedTargetingService } from '../services/qp-services/QpEditAssignedTargetingService';
import { QpGamePlanService } from '../services/qp-services/QpGamePlanService';
import { QpInsertionOrderService } from '../services/qp-services/QpInsertionOrderService';
import { QpLineItemService } from '../services/qp-services/QpLineItemsService';
import { validate } from '../validations';
import { campaignValidations } from '../validations/campaign.validation';

export class CampaignRoutes {
  private router: Router;
  private endpoint = '/campaign';

  private campaignController: CampaignController;

  constructor(router: Router) {
    this.router = router;

    // create qp advertiser service
    const qpAdvertiserService: QpAdvertiserService = new QpAdvertiserService(
      configs.QN_QP_BASE_URL,
      configs.QN_QP_API_TOKEN
    );

    // create qp campaign service
    const qpCampaignService: QpCampaignService = new QpCampaignService(
      configs.QN_QP_BASE_URL,
      configs.QN_QP_API_TOKEN
    );

    // create qp gamePlan service
    const qpGamePlanService: QpGamePlanService = new QpGamePlanService(
      configs.QN_QP_BASE_URL,
      configs.QN_QP_API_TOKEN
    );

    // create qp insertionOrder service
    const qpInsertionOrderService: QpInsertionOrderService =
      new QpInsertionOrderService(
        configs.QN_QP_BASE_URL,
        configs.QN_QP_API_TOKEN
      );

    // create qp lineItem service
    const qpLineItemService: QpLineItemService = new QpLineItemService(
      configs.QN_QP_BASE_URL,
      configs.QN_QP_API_TOKEN
    );

    // create qp editAssignedTargeting service
    const qpEditAssignedTargetingService: QpEditAssignedTargetingService =
      new QpEditAssignedTargetingService(
        configs.QN_QP_BASE_URL,
        configs.QN_QP_API_TOKEN
      );

    const campaignService: CampaignService = new CampaignServiceImpl(
      qpAdvertiserService,
      qpCampaignService,
      qpGamePlanService,
      qpInsertionOrderService,
      qpLineItemService,
      qpEditAssignedTargetingService
    );
    this.campaignController = new CampaignController(campaignService);
  }

  configureRoutes() {
    // create campaign
    this.router.post(
      this.endpoint,
      validate(campaignValidations.create),
      (req, res) => this.campaignController.create(req, res)
    );

    // fetch campaign
    this.router.get(
      this.endpoint,
      // validate(campaignValidations.create),
      (req, res) => this.campaignController.fetch(req, res)
    );

    // update campaign
    this.router.put(
      `${this.endpoint}/:campaignId`,
      validate(campaignValidations.update),
      (req, res) => this.campaignController.update(req, res)
    );

    // fetch campaign by id
    this.router.get(
      `${this.endpoint}/:campaignId`,
      validate(campaignValidations.fetchById),
      (req, res) => this.campaignController.fetchById(req, res)
    );

    this.router.put(
      `${this.endpoint}/:campaignId/publish`,
      validate(campaignValidations.publish),
      (req, res) => this.campaignController.publish(req, res)
    );
  }
}
