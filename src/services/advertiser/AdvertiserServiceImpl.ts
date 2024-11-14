import { Advertiser, ENTITY_STATUS } from '../../../generated/client';
import { locationDataOption } from '../../constants/campaign.constant';
import { prismaMain } from '../../database/prisma';
import { ApiUtils } from '../../utils/api';
import { AdvertiserService } from './AdvertiserService';

export class AdvertiserServiceImpl implements AdvertiserService {
  constructor(
    private baseUrl: string,
    private apiToken: string
  ) {}

  // create advertiser
  async create(advertiser: Advertiser): Promise<Advertiser> {
    // create record in db
    return await prismaMain.advertiser.create({
      data: advertiser
    });
  }

  // fetch all advertisers
  async fetch(): Promise<Advertiser[]> {
    return await prismaMain.advertiser.findMany();
  }

  // update advertiser
  async update(id: string, data: Advertiser): Promise<Advertiser> {
    // check given id exists
    const foundAdvertiser = await prismaMain.advertiser.findFirst({
      where: {
        id
      }
    });

    // throw error if not found
    if (!foundAdvertiser) {
      throw new Error('Advertiser not found.');
    }

    // update the record
    return await prismaMain.advertiser.update({
      data,
      where: {
        id
      }
    });
  }

  // fetch advertiser by id
  async fetchById(id: string): Promise<Advertiser> {
    // check given id exists
    const foundAdvertiser = await prismaMain.advertiser.findFirst({
      where: {
        id
      }
    });

    // throw error if not found
    if (!foundAdvertiser) {
      throw new Error('Advertiser not found.');
    }

    return foundAdvertiser;
  }

  // lookup advertiser by qp id
  async lookup(qpId: number): Promise<Advertiser> {
    // check given id exists
    const foundAdvertiser = await prismaMain.advertiser.findFirst({
      where: {
        qpId
      }
    });

    if (foundAdvertiser) {
      return foundAdvertiser;
    }

    // fetch from api
    const response = await ApiUtils.callApi({
      method: 'GET',
      url: `${this.baseUrl}/advertisers/${qpId}`,
      headers: {
        API_TOKEN: this.apiToken
      }
    });

    const qpAdvertiser = response.data.data;

    // create record in db
    return await prismaMain.advertiser.create({
      data: {
        qpId,
        displayName: qpAdvertiser.display_name,
        brandName: qpAdvertiser.brand_name || '', // TODO: get from qp
        entityStatus: ENTITY_STATUS.PUBLISHED,
        advertiserUrl: qpAdvertiser.domain_url || '',
        competitorUrl: [], // TODO: get from qp
        defaultRightMediaOfferTypeId: {
          label: String(
            qpAdvertiser.platform_specific_info?.TTD?.advertiser
              ?.DefaultRightMediaOfferTypeId || 1
          ),
          value: String(
            qpAdvertiser.platform_specific_info?.TTD?.advertiser
              ?.DefaultRightMediaOfferTypeId || 1
          )
        },
        geographicDetails: {
          timeZone: {
            // TODO: get from qp
            label: '',
            value: ''
          },
          currency: {
            value: qpAdvertiser.currency_code || '',
            label: qpAdvertiser.currency_code || ''
          },
          locations: locationDataOption.find(
            (item) => item.label === qpAdvertiser.country
          ) || {
            ttdValue: '',
            label: '',
            dv360Value: ''
          }
        }
      }
    });
  }
}
