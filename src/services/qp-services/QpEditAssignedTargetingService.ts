import {
  Advertiser,
  Campaign,
  ENTITY_STATUS,
  FilterItem
} from '../../../generated/client';
import {
  DEVICE_TYPES,
  LANGUAGE,
  VIEWABILITY
} from '../../constants/campaign.constant';
import { QpApiAction } from '../../constants/qp-api-service.constant';
import logger from '../../logger';
import { ApiUtils } from '../../utils/api';
import { PullingEntity, QpPullService } from './QpPullService';

export class QpEditAssignedTargetingService {
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
    qpLineItemId: number;
    qpInsertionOrderId?: number;
  }) {
    // extract config
    const { campaign, qpLineItemId, qpInsertionOrderId } = config;

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

    // get line item platform identifiers if its already created
    const lineItemPlatformIdentifiers =
      await this.qpPullService.getPlatformIdentifiers(
        PullingEntity.LineItem,
        ['DV360'],
        qpLineItemId || 0
      );
    platformIdentifiers[PullingEntity.LineItem] = lineItemPlatformIdentifiers;

    logger.info(
      `lineItemPlatformIdentifiers: ${JSON.stringify(lineItemPlatformIdentifiers)}`
    );

    return platformIdentifiers;
  }

  // map campaign
  private mapCampaign(config: {
    action: QpApiAction;
    campaign: Campaign;
    keywords: string[];
    targetingType: string;
    qpInsertionOrderId: number;
    deviceTargeting: FilterItem[];
  }) {
    // extract config
    const {
      action,
      campaign,
      keywords,
      targetingType,
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

    const geoTargeting = {
      targetingType: 'TARGETING_TYPE_GEO_REGION',
      assignedTargetingOptions: [
        ...(
          (campaign as any).locationList?.platforms?.DV360?.include || []
        ).map((geoTargetId: string) => ({
          geoRegionDetails: {
            targetingOptionId: geoTargetId,
            negative: false
          }
        })),
        ...(
          (campaign as any).locationList?.platforms?.DV360?.exclude || []
        ).map((geoTargetId: string) => ({
          geoRegionDetails: {
            targetingOptionId: geoTargetId,
            negative: true
          }
        }))
      ]
    };

    const selectedFrom = campaign.demographicInformation.demographic.from;
    const selectedTo = campaign.demographicInformation.demographic.to;

    const demoTargeting = {
      targetingType: 'TARGETING_TYPE_AGE_RANGE',
      assignedTargetingOptions: [
        ...ageRanges
          .filter(
            (range) => range.from >= selectedFrom && range.to <= selectedTo
          )
          .map((range) => ({
            ageRangeDetails: {
              ageRange:
                'AGE_RANGE_' +
                range.from +
                '_' +
                (range.to >= 65 ? 'PLUS' : range.to)
            }
          }))
      ]
    };

    // We are not using DeviceTargeting
    const deviceTargetingList = {
      targetingType: 'TARGETING_TYPE_DEVICE_TYPE',
      assignedTargetingOptions: [
        ...(deviceTargeting.map((device) => {
          return {
            deviceTypeDetails: {
              deviceType: DEVICE_TYPES['DV360'][device.value]
            }
          };
        }) || [])
      ]
    };

    const languageTargeting = {
      targetingType: 'TARGETING_TYPE_LANGUAGE',
      assignedTargetingOptions: [
        {
          languageDetails: {
            targetingOptionId: LANGUAGE['DV360'][campaign.language || ''],
            negative: false
          }
        }
      ]
    };

    const categoryContentExclusions = {
      targetingType: 'TARGETING_TYPE_CATEGORY',
      assignedTargetingOptions: [
        ...(campaign.ioTarget?.categoryContentExclusion.map((category) => {
          return {
            categoryDetails: {
              targetingOptionId: category.dv360Value,
              negative: true
            }
          };
        }) || [])
      ]
    };

    // TODO: ViewabilityTargeting
    const viewabilityTargeting = {
      targetingType: 'TARGETING_TYPE_VIEWABILITY',
      assignedTargetingOptions: [
        {
          viewabilityDetails: {
            viewability: VIEWABILITY[campaign.ioTarget?.viewability || 0]
          }
        }
      ]
    };

    // prepare platform specific info for DV360
    platform_specific_info['DV360'] = {
      bulkEditAssignedTargetingOptions: {
        createRequests: [
          {
            targetingType,
            assignedTargetingOptions: [
              ...keywords.map((keyword) => {
                switch (targetingType) {
                  case 'TARGETING_TYPE_KEYWORD':
                    return {
                      keywordDetails: {
                        keyword: keyword
                      }
                    };
                  case 'TARGETING_TYPE_AUDIENCE_GROUP':
                    return {
                      audienceGroupDetails: {
                        includedGoogleAudienceGroup: {
                          settings: [
                            {
                              googleAudienceId: keyword
                            }
                          ]
                        }
                      }
                    };
                  default:
                    return {
                      categoryDetails: {
                        targetingOptionId: keyword
                      }
                    };
                }
              })
            ]
          },
          geoTargeting,
          demoTargeting,
          languageTargeting,
          categoryContentExclusions,
          viewabilityTargeting
        ]
      }
    };

    return {
      entity: 'line_items',
      action: 'line_items.bulkEditAssignedTargetingOptions',
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

  // create editAssignedTargetingOptions
  private async create(config: {
    campaign: Campaign;
    keywords: string[];
    targetingType: string;
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

  // publish editAssignedTargetingOptions
  async publish(config: {
    campaign: Campaign;
    keywords: string[];
    qpLineItemId: number;
    targetingType: string;
    qpInsertionOrderId: number;
    deviceTargeting: FilterItem[];
  }): Promise<Campaign> {
    // extract config
    const { campaign } = config;

    await this.create(config);

    // update entity status
    campaign.entityStatus = ENTITY_STATUS.PUBLISH_REQUESTED;

    return campaign;
  }
}