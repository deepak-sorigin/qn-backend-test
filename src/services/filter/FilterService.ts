import {
  ContentThemes,
  DemographicInformation,
  FilterItem,
  RetoolTarget
} from '../../../generated/client';
import { PaginatedList } from '../../models/common/PaginatedList';
import { CategoryFilterResponse } from '../../models/filter/CategoryFilterResponse';

export abstract class FilterService {
  abstract category(filters: {
    pageNumber: number;
    limit: number;
    platform: string[];
    type: string[];
    search?: string;
  }): Promise<PaginatedList<CategoryFilterResponse>>;

  abstract keyword(filters: {
    campaignId: string;
    count: number;
  }): Promise<ContentThemes>;

  abstract retool360TargetList(filters: {
    campaignId: string;
    platform: string[];
  }): Promise<RetoolTarget[]>;

  abstract keywordsForSales(filters: {
    advertiserUrl: string;
    competitorUrl: string[];
    demographicInformation: DemographicInformation;
    count: number;
  }): Promise<ContentThemes>;

  abstract retool360TargetListForSales(filters: {
    contentThemes: ContentThemes;
    platform: string[];
  }): Promise<RetoolTarget[]>;

  abstract advertiser(filters: {
    pageNumber: number;
    limit: number;
    search?: string;
  }): Promise<PaginatedList<FilterItem>>;
}
