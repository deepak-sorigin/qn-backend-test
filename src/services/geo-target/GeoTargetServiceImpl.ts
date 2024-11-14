import { FilterItem, Prisma } from '../../../generated/client';
import { prismaMain } from '../../database/prisma';
import { PaginatedList } from '../../models/common/PaginatedList';
import { GeoTargetService } from './GeoTargetService';

export class GeoTargetServiceImpl extends GeoTargetService {
  // fetch geo location list filters
  async geoLocationList(filters: {
    pageNumber: number;
    limit: number;
    search?: string;
  }): Promise<PaginatedList<FilterItem>> {
    // create where clauses
    const whereClauses: Prisma.GeoLocationListWhereInput = {
      ...(filters.search
        ? {
            displayName: {
              contains: filters.search,
              mode: 'insensitive'
            }
          }
        : {})
    };

    // fetch geo location list
    const result = await prismaMain.geoLocationList.findMany({
      take: filters.limit,
      skip: (filters.pageNumber - 1) * filters.limit,
      where: whereClauses,
      select: {
        name: true,
        displayName: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    // map to FilterItem
    const list: FilterItem[] = result.map((item) => {
      return {
        label: item.displayName,
        value: item.name
      };
    });

    // fetch total count
    const total = await prismaMain.geoLocationList.count({
      where: whereClauses
    });

    return {
      list,
      total
    };
  }
}
