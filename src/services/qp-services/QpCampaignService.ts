import { Advertiser, Campaign, ENTITY_STATUS } from '../../../generated/client';
import { QpApiAction } from '../../constants/qp-api-service.constant';
import logger from '../../logger';
import { ApiUtils } from '../../utils/api';
import { CommonUtils } from '../../utils/common';
import { PullingEntity, QpPullService } from './QpPullService';

export class QpCampaignService {
  private baseUrl: string;
  private apiToken: string;
  private qpPullService: QpPullService;

  constructor(baseUrl: string, apiToken: string) {
    this.baseUrl = baseUrl;
    this.apiToken = apiToken;
    this.qpPullService = new QpPullService(baseUrl, apiToken);
  }

  private async getAllPlatformIdentifiers(campaign: Campaign) {
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
      `advertiserPlatformIdentifiers ${JSON.stringify(advertiserPlatformIdentifiers)}`
    );

    // get campaign platform identifiers if its already created
    if (campaign.qpId) {
      const campaignPlatformIdentifiers =
        await this.qpPullService.getPlatformIdentifiers(
          PullingEntity.Campaign,
          campaign.platforms
            .map((item) => item.value)
            .filter((item) => !['TTD', 'XANDR'].includes(item)), // removing TTD and XANDR for campaign
          campaign.qpId || 0,
          true // skip pulling platform id if not already created
        );
      platformIdentifiers[PullingEntity.Campaign] = campaignPlatformIdentifiers;

      logger.info(
        `campaignPlatformIdentifiers: ${JSON.stringify(campaignPlatformIdentifiers)}`
      );
    }

    return platformIdentifiers;
  }

  // map campaign
  private mapCampaign(
    action: QpApiAction,
    campaign: Campaign
  ) {
    const platforms = campaign.platforms.map((item) => item.value);

    const advertiser: Advertiser = (campaign as any).advertiser;

    // prepare platform specific info
    let platform_specific_info: any = {};
    let fromDate = new Date(campaign.flights[0].from);
    let toDate = new Date(campaign.flights[0].to);

    // prepare platform specific info for DV360
    if (platforms.includes('DV360')) {
      platform_specific_info['DV360'] = {
        campaign: {
          name: campaign.displayName,
          entityStatus: 'ENTITY_STATUS_ACTIVE',
          campaignGoal: {
            performanceGoal: {
              performanceGoalType:
                'PERFORMANCE_GOAL_TYPE_' + campaign.gamePlan?.kpi1Name,
              ...(campaign.gamePlan?.kpi1Name == 'CPC' ||
              campaign.gamePlan?.kpi1Name == 'CPA'
                ? {
                    performanceGoalAmountMicros:
                      '' +
                      CommonUtils.multiply(
                        campaign.gamePlan?.kpi1Value,
                        1000000
                      )
                  }
                : {
                    performanceGoalPercentageMicros:
                      '' +
                      CommonUtils.multiply(campaign.gamePlan?.kpi1Value, 10000)
                  })
            },
            campaignGoalType: campaign.goal.value
          },
          campaignFlight: {
            plannedDates: {
              startDate: {
                year: fromDate.getUTCFullYear(),
                month: fromDate.getUTCMonth() + 1,
                day: fromDate.getUTCDate()
              },
              endDate: {
                year: toDate.getUTCFullYear(),
                month: toDate.getUTCMonth() + 1,
                day: toDate.getUTCDate()
              }
            }
          },
          frequencyCap: {
            unlimited: true
            // timeUnit: campaign.ioTarget?.limitFrequency.exposerFrequency.value,
            // timeUnitCount: campaign.ioTarget?.limitFrequency.exposerPer,
            // maxImpressions: campaign.ioTarget?.limitFrequency.frequency,
            // maxViews: 100
          }
        }
      };
    }

    return {
      ...(action === QpApiAction.CREATE
        ? { advertiser_id: advertiser.qpId }
        : {}),
      display_name: campaign.displayName,
      entity_status: 'ACTIVE',
      ...(action === QpApiAction.CREATE ? { flight_ids: [] } : {}),
      platform_specific_info,
      syncs_with: platforms
    };
  }

  // create campaign
  private async create(campaign: Campaign) {
    const payload = this.mapCampaign(QpApiAction.CREATE, campaign);

    return await ApiUtils.callApi({
      method: 'POST',
      url: `${this.baseUrl}/campaigns`,
      headers: {
        API_TOKEN: this.apiToken
      },
      data: payload
    });
  }

  // update campaign
  private async update(qpId: number, campaign: Campaign) {
    const payload = this.mapCampaign(QpApiAction.UPDATE, campaign);

    return await ApiUtils.callApi({
      method: 'PUT',
      url: `${this.baseUrl}/campaigns/${qpId}`,
      headers: {
        API_TOKEN: this.apiToken
      },
      // data: campaign
      data: payload
    });
  }

  // publish campaign
  async publish(campaign: Campaign): Promise<Campaign> {
    // check if campaign has qpId
    if (campaign.qpId) {
      await this.update(campaign.qpId, campaign);
    } else {
      const response = await this.create(campaign);

      // update campaign qpId
      campaign.qpId = response.data.data.id;
    }

    // update entity status
    campaign.entityStatus = ENTITY_STATUS.PUBLISH_REQUESTED;

    return campaign;
  }
}