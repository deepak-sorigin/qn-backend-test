import { configs, loadConfigs } from '../../src/config';
import { GeoLocationListSeeder } from './GeoLocationList';

async function main() {
  // load external configs
  await loadConfigs();

  console.log(`Seeding for ${configs.NODE_ENV} environment...`);

  // get prisma client
  const { prismaMain } = require('../../src/database/prisma');

  // seed geo location lists
  await new GeoLocationListSeeder(prismaMain).seed();
  console.log('Geo location lists seeded');
}

main();
