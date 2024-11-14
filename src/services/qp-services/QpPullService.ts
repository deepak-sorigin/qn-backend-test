import { prismaMain } from '../../database/prisma';
import logger from '../../logger';
import { ApiUtils } from '../../utils/api';

export const PullingEntity = {
  Advertiser: 'Advertiser',
  Campaign: 'Campaign',
  InsertionOrder: 'InsertionOrder',
  LineItem: 'LineItem'
};

const configs = {
  [PullingEntity.Advertiser]: {
    url: (baseUrl: string, qpId: number) => `${baseUrl}/advertisers/${qpId}`,
    entityIdentifier: {
      DV360: 'platform_specific_info.DV360.advertiser.advertiserId',
      TTD: 'platform_specific_info.TTD.advertiser.AdvertiserId',
      XANDR: 'platform_specific_info.XANDR.advertiser.id'
    }
  },
  [PullingEntity.Campaign]: {
    url: (baseUrl: string, qpId: number) => `${baseUrl}/campaigns/${qpId}`,
    entityIdentifier: {
      DV360: 'platform_specific_info.DV360.campaign.campaignId',
      TTD: 'platform_specific_info.TTD.campaign.CampaignId',
      XANDR: 'platform_specific_info.XANDR.campaign.id'
    }
  },
  [PullingEntity.InsertionOrder]: {
    url: (baseUrl: string, qpId: number) =>
      `${baseUrl}/insertion-order/${qpId}`,
    entityIdentifier: {
      DV360: 'platform_specific_info.DV360.insertionOrder.insertionOrderId',
      TTD: 'platform_specific_info.TTD.insertionOrder.CampaignId',
      XANDR: 'platform_specific_info.XANDR.insertionOrder.id'
    }
  },
  [PullingEntity.LineItem]: {
    url: (baseUrl: string, qpId: number) => `${baseUrl}/line-item/${qpId}`,
    entityIdentifier: {
      DV360: 'platform_specific_info.DV360.lineItem.lineItemId',
      TTD: 'platform_specific_info.TTD.lineItem.AdGroupId',
      XANDR: 'platform_specific_info.XANDR.lineItem.id'
    }
  }
};

export class QpPullService {
  private baseUrl: string;
  private apiToken: string;
  private pullingId: number;

  constructor(baseUrl: string, apiToken: string) {
    this.baseUrl = baseUrl;
    this.apiToken = apiToken;
    this.pullingId = new Date().getTime();
  }

  async fetchEntity(
    entity: string,
    platforms: string[],
    qpId: number,
    startTime: number,
    resolve: any,
    reject: any
  ) {
    const currentTime = new Date().getTime();
    logger.info(
      `pullingId: ${this.pullingId}, currentTime: ${currentTime}, startTime: ${startTime}, diff: ${currentTime - startTime}`
    );
    // check startTime exceeds 3 minutes
    if (currentTime - startTime > 180000) {
      reject(new Error('Status pulling timeout.'));
      return;
    }

    try {
      // get api config for entity
      const entityConfig = configs[entity];

      const response = await ApiUtils.callApi({
        url: entityConfig.url(this.baseUrl, qpId),
        method: 'GET',
        headers: {
          API_TOKEN: `${this.apiToken}`
        }
      });

      const data = response.data.data;
      logger.info(`data: ${JSON.stringify(data)}`);
      const entityIdentifiers: any = {};
      for (const platform of platforms) {
        const identifier = (<any>entityConfig.entityIdentifier)[platform];
        const foundEntityId = this.getNestedProperty(data, identifier);
        logger.info(`identifier:${platform}: ${identifier}`);
        logger.info(`identifier:${platform}: ${foundEntityId}`);
        if (!foundEntityId) {
          // if entity id not found, continue to next api call after 10 seconds
          setTimeout(() => {
            this.fetchEntity(
              entity,
              platforms,
              qpId,
              startTime,
              resolve,
              reject
            );
          }, 10000);
          return;
        }
        entityIdentifiers[platform] = foundEntityId;
      }

      // got all entity identifiers
      resolve(entityIdentifiers);
    } catch (e) {
      console.log(e);
      logger.error('Error while pulling entity:', e);
      reject(e);
    }
  }

  getNestedProperty(obj: any, path: string) {
    return path.split('.').reduce((acc: any, key: any) => acc && acc[key], obj);
  }

  private async pullAndGetIdentifiers(
    entity: string,
    platforms: string[],
    qpId: number
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const startTime = new Date().getTime();
      this.fetchEntity(entity, platforms, qpId, startTime, resolve, reject);
    });
  }

  async getPlatformIdentifiers(
    entity: string,
    platforms: string[],
    qpId: number,
    skipPulling = false
  ) {
    // check if entity identifiers are available in db
    const foundIdentifiers = await prismaMain.platformIdentifier.findFirst({
      where: {
        qpId,
        entity
      }
    });

    if (foundIdentifiers) {
      return foundIdentifiers.identifiers;
    }

    // skip pulling if flag is set
    if (skipPulling) {
      return {};
    }

    // wait until advertiser is created on platforms
    const platformIdentifiers = await this.pullAndGetIdentifiers(
      entity,
      platforms,
      qpId
    );

    // save entity identifiers in db
    await prismaMain.platformIdentifier.create({
      data: {
        qpId,
        entity,
        identifiers: platformIdentifiers
      }
    });

    return platformIdentifiers;
  }
}
