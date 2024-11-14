import { PrismaClient } from '../../generated/client';
import geoLocationLists from './data/geo-lists.json';

export class GeoLocationListSeeder {
  constructor(private prismaMain: PrismaClient) {}

  async seed() {
    // iterate over the array and create the records and skip if already exists then update
    for (const geoLocationList of geoLocationLists) {
      const { name, displayName, level, platforms } = geoLocationList;
      const res = await this.prismaMain.geoLocationList.upsert({
        where: {
          name
        },
        update: {
          displayName,
          level,
          platforms
        },
        create: {
          name,
          displayName,
          level,
          platforms
        }
      });
      console.log(`GeoLocationList ${res.name} created/updated`);
    }
  }
}
