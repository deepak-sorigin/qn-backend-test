import { Advertiser, Campaign, ENTITY_STATUS } from '../../../generated/client';
import { QpApiAction } from '../../constants/qp-api-service.constant';
import logger from '../../logger';
import { ApiUtils } from '../../utils/api';
import { PullingEntity, QpPullService } from './QpPullService';

export class QpAdvertiserService {
  private baseUrl: string;
  private apiToken: string;
  private qpPullService: QpPullService;

  constructor(baseUrl: string, apiToken: string) {
    this.baseUrl = baseUrl;
    this.apiToken = apiToken;
    this.qpPullService = new QpPullService(baseUrl, apiToken);
  }

  private async getAllPlatformIdentifiers(campaign: Campaign) {
    const advertiser: Advertiser = (campaign as any).advertiser;
    // get advertiser platform identifiers
    const advertiserPlatformIdentifiers =
      await this.qpPullService.getPlatformIdentifiers(
        PullingEntity.Advertiser,
        campaign.platforms.map((item) => item.value),
        advertiser.qpId || 0,
        true // skip pulling platform id if not already created
      );

    logger.info(
      `advertiserPlatformIdentifiers: ${JSON.stringify(advertiserPlatformIdentifiers)}`
    );

    return {
      [PullingEntity.Advertiser]: advertiserPlatformIdentifiers
    };
  }

  // map advertiser
  private mapAdvertiser(action: QpApiAction, campaign: Campaign) {
    const platforms = campaign.platforms.map((item) => item.value);

    const advertiser: Advertiser = (campaign as any).advertiser;

    // prepare platform specific info
    let platform_specific_info: any = {};

    // prepare platform specific info for DV360
    if (platforms.includes('DV360')) {
      platform_specific_info['DV360'] = {
        advertiser: {
          partnerId: '5693431',
          name: advertiser.displayName,
          entityStatus: 'ENTITY_STATUS_ACTIVE',
          generalConfig: {
            currencyCode: advertiser.geographicDetails?.currency.value,
            domainUrl: advertiser.advertiserUrl
          },
          adServerConfig: {
            thirdPartyOnlyConfig: {}
          },
          creativeConfig: {},
          billingConfig: {
            billingProfileId: '1098279'
          }
        }
      };
    }

    // prepare platform specific info for TTD
    if (platforms.includes('TTD')) {
      platform_specific_info['TTD'] = {
        advertiser: {
          PartnerId: 'aeeepmp', // PartnerId: 'z48xa9x',
          AdvertiserName: advertiser.displayName,
          AttributionClickLookbackWindowInSeconds: 7776000,
          AttributionImpressionLookbackWindowInSeconds: 7776000,
          ClickDedupWindowInSeconds: 7,
          ConversionDedupWindowInSeconds: 60,
          DefaultRightMediaOfferTypeId:
            advertiser.defaultRightMediaOfferTypeId.value,
          DomainAddress: advertiser.advertiserUrl,
          CurrencyCode: advertiser.geographicDetails?.currency.value,
          AdvertiserCategory: {
            CategoryId: campaign.demographicInformation.category.value
          }
        }
      };
    }

    // prepare platform specific info for XANDR
    if (platforms.includes('XANDR')) {
      platform_specific_info['XANDR'] = {
        advertiser: {
          // ...(action === QpApiAction.UPDATE &&
          // platformIdentifiers[PullingEntity.Advertiser]?.XANDR
          //   ? {
          //       id: platformIdentifiers[PullingEntity.Advertiser]?.XANDR || ''
          //     }
          //   : {}),
          name: advertiser.displayName,
          legal_entity_name: 'Toyota UK',
          timezone: 'EST5EDT', // default - 'EST5EDT'
          default_currency: advertiser.geographicDetails.currency.value
        }
      };
    }

    return {
      partner_group_id: '42',
      display_name: advertiser.displayName,
      entity_status: 'ACTIVE',
      creator_id: 42,
      domain_url: advertiser.advertiserUrl,
      time_zone: 'EST5EDT', // TODO: default - 'EST5EDT' for XANDR
      currency_code: advertiser.geographicDetails?.currency.value,
      logo: 'logo',
      country: advertiser.geographicDetails.locations.label,
      platform_specific_info,
      syncs_with: platforms
    };
  }

  // create advertiser
  private async create(campaign: Campaign) {
    const payload = this.mapAdvertiser(QpApiAction.CREATE, campaign);

    return await ApiUtils.callApi({
      method: 'POST',
      url: `${this.baseUrl}/advertisers`,
      headers: {
        API_TOKEN: this.apiToken
      },
      data: payload
    });
  }

  // update advertiser
  private async update(qpId: number, campaign: Campaign) {
    const payload = this.mapAdvertiser(QpApiAction.UPDATE, campaign);

    return await ApiUtils.callApi({
      method: 'PUT',
      url: `${this.baseUrl}/advertisers/${qpId}`,
      headers: {
        API_TOKEN: this.apiToken
      },
      // data: advertiser
      data: payload
    });
  }

  // publish advertiser
  async publish(campaign: Campaign): Promise<Advertiser> {
    // check if advertiser has qpId
    const advertiser: Advertiser = (campaign as any).advertiser;
    if (advertiser.qpId) {
      await this.update(advertiser.qpId, campaign);
    } else {
      const response = await this.create(campaign);

      // update advertiser qpId
      advertiser.qpId = response.data.data.id;
    }

    // update entity status
    advertiser.entityStatus = ENTITY_STATUS.PUBLISH_REQUESTED;

    return advertiser;
  }
}
