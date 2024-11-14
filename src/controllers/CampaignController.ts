import { Request, Response } from 'express';
import { Campaign } from '../../generated/client';
import logger from '../logger';
import { ApiResponse } from '../models/common/ApiResponse';
import { PaginatedApiResponse } from '../models/common/PaginatedApiResponse';
import { CampaignService } from '../services/campaign/CampaignService';
import { RestUtils } from '../utils/rest';

export class CampaignController {
  private campaignService: CampaignService;

  constructor(campaignService: CampaignService) {
    this.campaignService = campaignService;
  }

  async create(request: Request, response: Response) {
    try {
      // extract payload
      const payload: Campaign = request.body;

      // call service
      const campaign = await this.campaignService.create(payload);

      // prepare response payload
      const apiResponse: ApiResponse<Campaign> = {
        status: 200,
        message: `Campaign created successfully.`,
        data: campaign
      };

      // send response
      response.status(apiResponse.status).send(apiResponse);
    } catch (error) {
      logger.error('campaign-create-error', error);
      // prepare error payload
      const apiError = RestUtils.handleError(error);

      // send response
      response.status(apiError.status).send(apiError);
    }
  }

  async fetch(request: Request, response: Response) {
    try {
      // call service
      const campaignList = await this.campaignService.fetch();

      // prepare response payload
      const apiResponse: PaginatedApiResponse<Campaign> = {
        status: 200,
        message: `Campaign list fetched successfully.`,
        data: campaignList,
        total: campaignList.length,
        pageNumber: 1,
        limit: 10
      };

      // send response
      response.status(apiResponse.status).send(apiResponse);
    } catch (error) {
      logger.error('campaign-fetch-error', error);
      // prepare error payload
      const apiError = RestUtils.handleError(error);

      // send response
      response.status(apiError.status).send(apiError);
    }
  }

  async update(request: Request, response: Response) {
    try {
      // extract id from params
      const campaignId = request.params.campaignId;

      // extract payload
      const payload: Campaign = request.body;

      // call service
      const campaign = await this.campaignService.update(campaignId, payload);

      // prepare response payload
      const apiResponse: ApiResponse<Campaign> = {
        status: 200,
        message: `Campaign updated successfully.`,
        data: campaign
      };

      // send response
      response.status(apiResponse.status).send(apiResponse);
    } catch (error) {
      logger.error('campaign-update-error', error);
      // prepare error payload
      const apiError = RestUtils.handleError(error);

      // send response
      response.status(apiError.status).send(apiError);
    }
  }

  async fetchById(request: Request, response: Response) {
    try {
      // extract id from params
      const campaignId = request.params.campaignId;

      // call service
      const campaign = await this.campaignService.fetchById(campaignId);

      // prepare response payload
      const apiResponse: ApiResponse<Campaign> = {
        status: 200,
        message: `Campaign fetched successfully.`,
        data: campaign
      };

      // send response
      response.status(apiResponse.status).send(apiResponse);
    } catch (error) {
      logger.error('campaign-fetchById-error', error);
      // prepare error payload
      const apiError = RestUtils.handleError(error);

      // send response
      response.status(apiError.status).send(apiError);
    }
  }

  // publish advertiser
  async publish(request: Request, response: Response) {
    try {
      // extract id from params
      const campaignId = request.params.campaignId;

      // call service
      const campaign = await this.campaignService.publish(campaignId);

      // prepare response payload
      const apiResponse: ApiResponse<Campaign> = {
        status: 200,
        message: `Campaign publish requested successfully.`,
        data: campaign
      };

      // send response
      response.status(apiResponse.status).send(apiResponse);
    } catch (error) {
      logger.error('campaign-publish-error', error);
      // prepare error payload
      const apiError = RestUtils.handleError(error);

      // send response
      response.status(apiError.status).send(apiError);
    }
  }
}
