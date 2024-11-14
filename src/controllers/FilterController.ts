import { logger } from '@azure/identity';
import { Request, Response } from 'express';
import {
  ContentThemes,
  FilterItem,
  RetoolTarget
} from '../../generated/client';
import { ApiResponse } from '../models/common/ApiResponse';
import { PaginatedApiResponse } from '../models/common/PaginatedApiResponse';
import { CategoryFilterResponse } from '../models/filter/CategoryFilterResponse';
import { FilterService } from '../services/filter/FilterService';
import { RestUtils } from '../utils/rest';

export class FilterController {
  private filterService: FilterService;

  constructor(filterService: FilterService) {
    this.filterService = filterService;
  }

  // fetch category filters
  async category(request: Request, response: Response) {
    try {
      // extract query params
      const { pageNumber, limit, platform, type, search } = request.query;

      // call service
      const categoryList = await this.filterService.category({
        pageNumber: Number(pageNumber) || 1,
        limit: Number(limit) || 10,
        platform: platform ? String(platform).split(',') : [],
        type: type ? String(type).split(',') : [],
        search: search ? String(search) : undefined
      });

      // prepare response payload
      const apiResponse: PaginatedApiResponse<CategoryFilterResponse> = {
        status: 200,
        message: `Category list fetched successfully.`,
        data: categoryList.list,
        total: categoryList.total,
        pageNumber: Number(pageNumber) || 1,
        limit: Number(limit) || 10
      };

      // send response
      response.status(apiResponse.status).send(apiResponse);
    } catch (error) {
      logger.error('category-fetch-error', error);
      // prepare error payload
      const apiError = RestUtils.handleError(error);

      // send response
      response.status(apiError.status).send(apiError);
    }
  }

  // fetch keyword filters
  async keyword(request: Request, response: Response) {
    try {
      // extract query params
      const { campaignId, count } = request.query;

      // call service
      const keywords = await this.filterService.keyword({
        campaignId: String(campaignId),
        count: Number(count) || 25
      });

      // prepare response payload
      const apiResponse: ApiResponse<ContentThemes> = {
        status: 200,
        message: `Keyword list fetched successfully.`,
        data: keywords
      };

      // send response
      response.status(apiResponse.status).send(apiResponse);
    } catch (error) {
      logger.error('keyword-fetch-error', error);
      // prepare error payload
      const apiError = RestUtils.handleError(error);

      // send response
      response.status(apiError.status).send(apiError);
    }
  }

  // fetch retool360 target list
  async retool360TargetList(request: Request, response: Response) {
    try {
      // extract query params
      const { campaignId, platform } = request.query;

      // call service
      const targets = await this.filterService.retool360TargetList({
        campaignId: String(campaignId),
        platform: platform ? String(platform).split(',') : []
      });

      // prepare response payload
      const apiResponse: ApiResponse<RetoolTarget[]> = {
        status: 200,
        message: `360 target list fetched successfully.`,
        data: targets
      };

      // send response
      response.status(apiResponse.status).send(apiResponse);
    } catch (error) {
      logger.error('retool360-target-fetch-error', error);
      // prepare error payload
      const apiError = RestUtils.handleError(error);

      // send response
      response.status(apiError.status).send(apiError);
    }
  }

  // fetch keywords filters for sales
  async keywordsForSales(request: Request, response: Response) {
    try {
      // extract query params
      const { count } = request.query;
      const { advertiserUrl, competitorUrl, demographicInformation } =
        request.body;

      // call service
      const keywords = await this.filterService.keywordsForSales({
        advertiserUrl,
        competitorUrl,
        demographicInformation,
        count: Number(count) || 25
      });

      // prepare response payload
      const apiResponse: ApiResponse<ContentThemes> = {
        status: 200,
        message: `Keywords list fetched successfully.`,
        data: keywords
      };

      // send response
      response.status(apiResponse.status).send(apiResponse);
    } catch (error) {
      logger.error('keywords-fetch-error', error);
      // prepare error payload
      const apiError = RestUtils.handleError(error);

      // send response
      response.status(apiError.status).send(apiError);
    }
  }

  // fetch retool360 target list for sales
  async retool360TargetListForSales(request: Request, response: Response) {
    try {
      // extract query params
      const { platform } = request.query;
      const { contentThemes } = request.body;

      // call service
      const targets = await this.filterService.retool360TargetListForSales({
        contentThemes,
        platform: platform ? String(platform).split(',') : []
      });

      // prepare response payload
      const apiResponse: ApiResponse<RetoolTarget[]> = {
        status: 200,
        message: `360 target list fetched successfully.`,
        data: targets
      };

      // send response
      response.status(apiResponse.status).send(apiResponse);
    } catch (error) {
      logger.error('retool360-target-fetch-error', error);
      // prepare error payload
      const apiError = RestUtils.handleError(error);

      // send response
      response.status(apiError.status).send(apiError);
    }
  }

  // fetch advertiser filters
  async advertiser(request: Request, response: Response) {
    try {
      // extract query params
      const { pageNumber, limit, search } = request.query;

      // call service
      const advertiserList = await this.filterService.advertiser({
        pageNumber: Number(pageNumber) || 1,
        limit: Number(limit) || 10,
        search: search ? String(search) : undefined
      });

      // prepare response payload
      const apiResponse: PaginatedApiResponse<FilterItem> = {
        status: 200,
        message: `Advertiser list fetched successfully.`,
        data: advertiserList.list,
        total: advertiserList.total,
        pageNumber: Number(pageNumber) || 1,
        limit: Number(limit) || 10
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
}
