import { logger } from '@azure/identity';
import { Request, Response } from 'express';
import { FilterItem } from '../../generated/client';
import { PaginatedApiResponse } from '../models/common/PaginatedApiResponse';
import { GeoTargetService } from '../services/geo-target/GeoTargetService';
import { RestUtils } from '../utils/rest';

export class GeoTargetController {
  private geoTargetService: GeoTargetService;

  constructor(geoTargetService: GeoTargetService) {
    this.geoTargetService = geoTargetService;
  }

  // fetch geo location list filters
  async geoLocationList(request: Request, response: Response) {
    try {
      // extract query params
      const { pageNumber, limit, search } = request.query;

      // call service
      const geoLocationList = await this.geoTargetService.geoLocationList({
        pageNumber: Number(pageNumber) || 1,
        limit: Number(limit) || 10,
        search: search ? String(search) : undefined
      });

      // prepare response payload
      const apiResponse: PaginatedApiResponse<FilterItem> = {
        status: 200,
        message: `Geo location list fetched successfully.`,
        data: geoLocationList.list,
        total: geoLocationList.total,
        pageNumber: Number(pageNumber) || 1,
        limit: Number(limit) || 10
      };

      // send response
      response.status(apiResponse.status).send(apiResponse);
    } catch (error) {
      logger.error('geo-location-list-fetch-error', error);
      // prepare error payload
      const apiError = RestUtils.handleError(error);

      // send response
      response.status(apiError.status).send(apiError);
    }
  }
}
