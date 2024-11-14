import {
  Advertiser,
  Campaign,
  ENTITY_STATUS,
  FilterItem
} from '../../../generated/client';
import {
  DEVICE_TYPES,
  GENDER,
  LANGUAGE
} from '../../constants/campaign.constant';
import { QpApiAction } from '../../constants/qp-api-service.constant';
import logger from '../../logger';
import { ApiUtils } from '../../utils/api';
import { PullingEntity, QpPullService } from './QpPullService';

export class QpProfileService {
  private baseUrl: string;
  private apiToken: string;
  private qpPullService: QpPullService;

  constructor(baseUrl: string, apiToken: string) {
    this.baseUrl = baseUrl;
    this.apiToken = apiToken;
    this.qpPullService = new QpPullService(baseUrl, apiToken);
  }

  private async getAllPlatformIdentifiers(config: {
    campaign: Campaign;
    qpInsertionOrderId?: number;
  }) {
    // extract config
    const { campaign, qpInsertionOrderId } = config;

    const platformIdentifiers: any = {};
    const advertiser: Advertiser = (campaign as any).advertiser;
    // get advertiser platform identifiers
    const advertiserPlatformIdentifiers =
      await this.qpPullService.getPlatformIdentifiers(
        PullingEntity.Advertiser,
        campaign.platforms.map((item) => item.value),
        advertiser.qpId || 0
      );
    platformIdentifiers[PullingEntity.Advertiser] =
      advertiserPlatformIdentifiers;

    logger.info(
      `advertiserPlatformIdentifiers: ${JSON.stringify(advertiserPlatformIdentifiers)}`
    );

    // get campaign platform identifiers if its already created
    const campaignPlatformIdentifiers =
      await this.qpPullService.getPlatformIdentifiers(
        PullingEntity.Campaign,
        campaign.platforms
          .map((item) => item.value)
          .filter((item) => !['TTD', 'XANDR'].includes(item)), // removing TTD and XANDR for campaign
        campaign.qpId || 0
      );
    platformIdentifiers[PullingEntity.Campaign] = campaignPlatformIdentifiers;

    logger.info(
      `campaignPlatformIdentifiers: ${JSON.stringify(campaignPlatformIdentifiers)}`
    );

    // get insertion order platform identifiers if its already created
    const insertionOrderPlatformIdentifiers =
      await this.qpPullService.getPlatformIdentifiers(
        PullingEntity.InsertionOrder,
        campaign.platforms.map((item) => item.value),
        qpInsertionOrderId || 0
      );
    platformIdentifiers[PullingEntity.InsertionOrder] =
      insertionOrderPlatformIdentifiers;

    logger.info(
      `insertionOrderPlatformIdentifiers: ${JSON.stringify(insertionOrderPlatformIdentifiers)}`
    );

    return platformIdentifiers;
  }

  private async getPlatformIdentifierLineItem(config: { qpId: number }) {
    // extract config
    const { qpId } = config;

    return await this.qpPullService.getPlatformIdentifiers(
      PullingEntity.LineItem,
      ['XANDR'],
      qpId || 0
    );
  }

  // map campaign
  private mapCampaign(config: {
    action: QpApiAction;
    campaign: Campaign;
    platformIdentifiers: any;
    qpInsertionOrderId: number;
    deviceTargeting: FilterItem[];
  }) {
    // extract config
    const {
      action,
      campaign,
      platformIdentifiers,
      qpInsertionOrderId,
      deviceTargeting
    } = config;

    const advertiser: Advertiser = (campaign as any).advertiser;
    // prepare platform specific info
    let platform_specific_info: any = {};
    const ageRanges = [
      { from: 18, to: 24 },
      { from: 25, to: 34 },
      { from: 35, to: 44 },
      { from: 45, to: 54 },
      { from: 55, to: 64 },
      { from: 65, to: 74 }
    ];

    //TODO: Work on this once we get geo list
    const regionTargeting = {
      region_action: 'include',
      region_targets: [
        {
          id: 3950, //TODO: location id
          name: 'New York',
          code: 'NY',
          country_name: 'United States',
          country_code: 'US'
        }
      ]
    };

    //TODO: Work on this once we get geo list
    const cityTargeting = {
      city_action: 'include',
      city_targets: [
        {
          id: 200942, //TODO: location id
          name: 'Portland',
          region_name: 'Oregon',
          region_code: 'OR',
          country_code: 'US',
          country_name: 'United States'
        }
      ]
    };

    //TODO: Work on this once we get geo list
    const countryTargeting = {
      country_action: 'include',
      country_targets: [
        {
          id: 233, //TODO: location id
          name: 'United States',
          code: 'US'
        }
      ]
    };

    const selectedFrom = campaign.demographicInformation.demographic.from;
    const selectedTo = campaign.demographicInformation.demographic.to;

    const ageTargeting = {
      age_targets: {
        allow_unknown: false,
        ages: [
          ...ageRanges
            .filter(
              (range) => range.from >= selectedFrom && range.to <= selectedTo
            )
            .map((range) => ({
              low: range.from,
              high: range.to
            }))
        ]
      }
    };

    const genderTargeting = {
      gender_targets: {
        allow_unknown: true,
        gender:
          GENDER['XANDR'][
            campaign.demographicInformation.demographic.gender.value
          ]
      }
    };

    const deviceTargetingList = {
      device_type_action: 'include',
      device_type_targets: [
        ...deviceTargeting.map(
          (device) => DEVICE_TYPES['XANDR'][device.value] || []
        )
      ]
    };

    const languageTargeting = {
      language_action: 'include',
      language_targets: [
        {
          id: LANGUAGE['XANDR'][campaign.language || 0],
          name: campaign.language == 'English' ? 'English' : 'French',
          code: campaign.language == 'English' ? 'EN' : 'FR',
          deleted: false
        }
      ]
    };

    // prepare platform specific info for XANDR
    platform_specific_info['XANDR'] = {
      profile: {
        advertiser_id: platformIdentifiers[PullingEntity.Advertiser].XANDR,
        // name: 'test profile by vasanta!', //TODO: What will be the name of profile
        max_lifetime_imps: campaign.ioTarget?.limitFrequency.frequency,
        max_hour_imps:
          campaign.ioTarget?.limitFrequency.exposerFrequency.value ===
          'TIME_UNIT_HOURS'
            ? campaign.ioTarget?.limitFrequency.exposerPer
            : null,
        max_day_imps:
          campaign.ioTarget?.limitFrequency.exposerFrequency.value ===
          'TIME_UNIT_DAYS'
            ? campaign.ioTarget?.limitFrequency.exposerPer
            : null,
        max_week_imps:
          campaign.ioTarget?.limitFrequency.exposerFrequency.value ===
          'TIME_UNIT_WEEKS'
            ? campaign.ioTarget?.limitFrequency.exposerPer
            : null,
        max_month_imps:
          campaign.ioTarget?.limitFrequency.exposerFrequency.value ===
          'TIME_UNIT_MONTHS'
            ? campaign.ioTarget?.limitFrequency.exposerPer
            : null,
        ...regionTargeting,
        ...ageTargeting,
        ...genderTargeting,
        ...deviceTargetingList,
        ...languageTargeting,
        ...cityTargeting,
        ...countryTargeting
      }
    };

    return {
      entity: 'line_items',
      action: 'line_items.profile.create',
      dbObject: {
        line_items: {
          ...(action === QpApiAction.CREATE
            ? { advertiser_id: advertiser.qpId }
            : {}),
          ...(action === QpApiAction.CREATE
            ? { campaign_id: campaign.qpId }
            : {}),
          ...(action === QpApiAction.CREATE
            ? { game_plan_id: campaign.qpGamePlanId }
            : {}),
          ...(action === QpApiAction.CREATE
            ? { insertion_order_id: qpInsertionOrderId }
            : {}),
          platform_specific_info
        }
      }
    };
  }

  // create xandr profile
  private async create(config: {
    campaign: Campaign;
    platformIdentifiers: any;
    qpInsertionOrderId: number;
    deviceTargeting: FilterItem[];
  }) {
    const payload = this.mapCampaign({
      action: QpApiAction.CREATE,
      ...config
    });

    return await ApiUtils.callApi({
      method: 'POST',
      url: `${this.baseUrl}/scripts/list`,
      headers: {
        API_TOKEN: this.apiToken
      },
      data: payload
    });
  }

  // // update line_item
  // private async update(config: {
  //   qpId: number;
  //   campaign: Campaign;
  //   platform: string;
  //   lineItemName: string;
  //   qpInsertionOrderId: number;
  //   deviceName: string;
  //   deviceTargeting: FilterItem[];
  //   format: string;
  //   category?: RetoolTarget;
  //   platformIdentifiers?: any;
  // }) {
  //   const payload = this.mapCampaign({
  //     action: QpApiAction.UPDATE,
  //     ...config
  //   });

  //   return await ApiUtils.callApi({
  //     method: 'PUT',
  //     url: `${this.baseUrl}/scripts/list/${config.qpId}`,
  //     headers: {
  //       API_TOKEN: this.apiToken
  //     },
  //     data: payload
  //   });
  // }

  // publish xandr profile
  async publish(config: {
    campaign: Campaign;
    qpInsertionOrderId: number;
    deviceTargeting: FilterItem[];
  }): Promise<Campaign> {
    // extract config
    const { campaign } = config;

    // get all platform identifiers
    const platformIdentifiers = await this.getAllPlatformIdentifiers({
      ...config
    });

    const response = await this.create({
      ...config,
      platformIdentifiers
    });

    // update line_item qpLineItemId
    const qpId = response.data.data.id;

    // wait for platform specific line item creation
    // await this.getPlatformIdentifierLineItem({ qpId: qpId || 0 });

    // update entity status
    campaign.entityStatus = ENTITY_STATUS.PUBLISH_REQUESTED;

    return qpId || -1;
  }
}
