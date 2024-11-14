import { Request, Response } from 'express';
import { Advertiser } from '../../generated/client';
import logger from '../logger';
import { ApiResponse } from '../models/common/ApiResponse';
import { PaginatedApiResponse } from '../models/common/PaginatedApiResponse';
import { AdvertiserService } from '../services/advertiser/AdvertiserService';
import { RestUtils } from '../utils/rest';

export class AdvertiserController {
  private advertiserService: AdvertiserService;

  constructor(advertiserService: AdvertiserService) {
    this.advertiserService = advertiserService;
  }

  // create advertiser
  async create(request: Request, response: Response) {
    try {
      // extract payload
      const payload: Advertiser = request.body;

      // call service
      const advertiser = await this.advertiserService.create(payload);

      // prepare response payload
      const apiResponse: ApiResponse<Advertiser> = {
        status: 200,
        message: `Advertiser created successfully.`,
        data: advertiser
      };

      // send response
      response.status(apiResponse.status).send(apiResponse);
    } catch (error) {
      logger.error('advertiser-create-error', error);
      // prepare error payload
      const apiError = RestUtils.handleError(error);

      // send response
      response.status(apiError.status).send(apiError);
    }
  }

  // fetch advertisers
  async fetch(request: Request, response: Response) {
    try {
      // call service
      const advertiserList = await this.advertiserService.fetch();

      // prepare response payload
      const apiResponse: PaginatedApiResponse<Advertiser> = {
        status: 200,
        message: `Advertiser list fetched successfully.`,
        data: advertiserList,
        total: advertiserList.length,
        pageNumber: 1,
        limit: 10
      };

      // send response
      response.status(apiResponse.status).send(apiResponse);
    } catch (error) {
      logger.error('advertiser-fetch-error', error);
      // prepare error payload
      const apiError = RestUtils.handleError(error);

      // send response
      response.status(apiError.status).send(apiError);
    }
  }

  // update advertiser
  async update(request: Request, response: Response) {
    try {
      // extract id from params
      const advertiserId = request.params.advertiserId;

      // extract payload
      const payload: Advertiser = request.body;

      // call service
      const advertiser = await this.advertiserService.update(
        advertiserId,
        payload
      );

      // prepare response payload
      const apiResponse: ApiResponse<Advertiser> = {
        status: 200,
        message: `Advertiser updated successfully.`,
        data: advertiser
      };

      // send response
      response.status(apiResponse.status).send(apiResponse);
    } catch (error) {
      logger.error('advertiser-update-error', error);
      // prepare error payload
      const apiError = RestUtils.handleError(error);

      // send response
      response.status(apiError.status).send(apiError);
    }
  }

  // fetch advertiser by id
  async fetchById(request: Request, response: Response) {
    try {
      // extract id from params
      const advertiserId = request.params.advertiserId;

      // call service
      const advertiser = await this.advertiserService.fetchById(advertiserId);

      // prepare response payload
      const apiResponse: ApiResponse<Advertiser> = {
        status: 200,
        message: `Advertiser fetched successfully.`,
        data: advertiser
      };

      // send response
      response.status(apiResponse.status).send(apiResponse);
    } catch (error) {
      logger.error('advertiser-fetchById-error', error);
      // prepare error payload
      const apiError = RestUtils.handleError(error);

      // send response
      response.status(apiError.status).send(apiError);
    }
  }

  // lookup advertiser by qp id
  async lookup(request: Request, response: Response) {
    try {
      // extract qpId from params
      const qpId = parseInt(request.params.qpId);

      // call service
      const advertiser = await this.advertiserService.lookup(qpId);

      // prepare response payload
      const apiResponse: ApiResponse<Advertiser> = {
        status: 200,
        message: `Advertiser fetched successfully.`,
        data: advertiser
      };

      // send response
      response.status(apiResponse.status).send(apiResponse);
    } catch (error) {
      logger.error('advertiser-lookup-error', error);
      // prepare error payload
      const apiError = RestUtils.handleError(error);

      // send response
      response.status(apiError.status).send(apiError);
    }
  }
}
