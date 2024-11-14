import { FilterItem } from '../../../generated/client';
import { PaginatedList } from '../../models/common/PaginatedList';

export abstract class GeoTargetService {
  abstract geoLocationList(filters: {
    pageNumber: number;
    limit: number;
    search?: string;
  }): Promise<PaginatedList<FilterItem>>;
}
