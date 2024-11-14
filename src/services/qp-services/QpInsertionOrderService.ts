import moment from 'moment';
import { Advertiser, Campaign } from '../../../generated/client';
import { TIME_UNITS } from '../../constants/campaign.constant';
import { QpApiAction } from '../../constants/qp-api-service.constant';
import logger from '../../logger';
import { ApiUtils } from '../../utils/api';
import { CommonUtils } from '../../utils/common';
import { PullingEntity, QpPullService } from './QpPullService';

export class QpInsertionOrderService {
  private baseUrl: string;
  private apiToken: string;
  private qpPullService: QpPullService;

  constructor(baseUrl: string, apiToken: string) {
    this.baseUrl = baseUrl;
    this.apiToken = apiToken;
    this.qpPullService = new QpPullService(baseUrl, apiToken);
  }

  private async getAllPlatformIdentifiers(
    campaign: Campaign,
    platform: string,
    qpInsertionOrderId?: number
  ) {
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
    if (qpInsertionOrderId) {
      const insertionOrderPlatformIdentifiers =
        await this.qpPullService.getPlatformIdentifiers(
          PullingEntity.InsertionOrder,
          [platform],
          qpInsertionOrderId || 0,
          true // skip pulling platform id if not already created
        );
      platformIdentifiers[PullingEntity.InsertionOrder] =
        insertionOrderPlatformIdentifiers;

      logger.info(
        `insertionOrderPlatformIdentifiers: ${JSON.stringify(insertionOrderPlatformIdentifiers)}`
      );
    }

    return platformIdentifiers;
  }

  // map campaign
  private mapCampaign(
    action: QpApiAction,
    campaign: Campaign,
    platform: string,
    format: string
  ) {
    // const platforms = campaign.platforms.map((item) => item.value);

    const advertiser: Advertiser = (campaign as any).advertiser;

    let fromDate = new Date(campaign.flights[0].from);
    let toDate = new Date(campaign.flights[0].to);

    // prepare platform specific info
    let platform_specific_info: any = {};

    // prepare display name
    const displayName = CommonUtils.getName([
      advertiser.displayName, // Advertiser Name
      advertiser.brandName, // Brand Name
      campaign.displayName, // Campaign Name
      campaign.channel[0].value, // Channel
      platform == 'XANDR' ? 'XND' : platform, // Platform
      format, // Format
      campaign.locationListName ?? 'Geo-List', // GEO
      campaign.language == 'English' ? 'EN' : 'FR', // Language
      'ALL', // Audience Cluster
      moment(fromDate).utc().format('DDMMMYY'), // Start Date
      moment(toDate).utc().format('DDMMMYY'), // End Date
      campaign.billingCode, // Billing Code
      campaign.gamePlan?.kpi1Name == 'VIEWABILITY'
        ? 'VTR'
        : campaign.gamePlan?.kpi1Name ?? '', // Optimization Type
      '/' // CSC
    ]);

    // prepare platform specific info for DV360
    if (platform === 'DV360') {
      platform_specific_info['DV360'] = {
        insertionOrder: {
          displayName,
          entityStatus: 'ENTITY_STATUS_DRAFT',
          pacing: {
            pacingPeriod: 'PACING_PERIOD_FLIGHT',
            pacingType: 'PACING_TYPE_AHEAD',
            dailyMaxMicros: '1500000'
          },
          frequencyCap: {
            unlimited: false,
            timeUnit: campaign.ioTarget?.limitFrequency.exposerFrequency.value,
            timeUnitCount: campaign.ioTarget?.limitFrequency.exposerPer,
            maxImpressions: campaign.ioTarget?.limitFrequency.frequency
          },
          kpi: {
            kpiType: 'KPI_TYPE_' + campaign.gamePlan?.kpi1Name,
            ...(campaign.gamePlan?.kpi1Name == 'CPC' ||
            campaign.gamePlan?.kpi1Name == 'CPA'
              ? {
                  kpiAmountMicros:
                    '' +
                    CommonUtils.multiply(campaign.gamePlan?.kpi1Value, 1000000)
                }
              : {
                  kpiPercentageMicros:
                    '' +
                    CommonUtils.multiply(campaign.gamePlan?.kpi1Value, 10000)
                })
          },
          budget: {
            budgetUnit: 'BUDGET_UNIT_CURRENCY',
            automationType: 'INSERTION_ORDER_AUTOMATION_TYPE_BUDGET',
            budgetSegments: [
              {
                budgetAmountMicros:
                  '' +
                  (
                    ((campaign.gamePlan?.budget || 0) /
                      campaign.platforms.length) *
                    1000000
                  ).toFixed(),
                dateRange: {
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
              }
            ]
          },
          bidStrategy: {
            fixedBid: {
              bidAmountMicros: '500000'
            }
          }
        }
      };
    }

    // prepare platform specific info for TTD
    if (platform === 'TTD') {
      platform_specific_info['TTD'] = {
        insertionOrder: {
          Budget: {
            Amount: CommonUtils.multiply(
              (campaign.gamePlan?.budget || 0) / campaign.platforms.length,
              1
            ),
            CurrencyCode: advertiser.geographicDetails.currency.value
          },
          CampaignConversionReportingColumns: [],
          CampaignName: displayName,
          AssociatedBidLists: [],
          AutoAllocatorEnabled: true,
          AutoPrioritizationEnabled: true,
          Availability: 'Available',
          CampaignType: 'Standard',
          CustomCPAType: 'Disabled',
          CustomLabels: [],
          CustomROASType: 'Disabled',
          // DailyBudget: {
          //   Amount: 1,
          //   CurrencyCode: campaign.geographicDetails.currency.value
          // },
          DefaultBidLists: [],
          Description: 'Campaign to test API based creation without flight',
          Increments: [],
          IsBallotMeasure: false,
          NewFrequencyConfigs: [
            {
              CounterId: '1',
              CounterName: 'First frequency config',
              FrequencyCap: campaign.ioTarget?.limitFrequency.frequency,
              ResetIntervalInMinutes:
                '' +
                CommonUtils.multiply(
                  campaign.ioTarget?.limitFrequency.exposerPer,
                  TIME_UNITS[
                    campaign.ioTarget?.limitFrequency.exposerFrequency.value ||
                      1
                  ]
                )
            }
          ],
          PacingMode: 'PaceAhead',
          Objective: 'Awareness',
          PrimaryChannel: 'Display',
          PrimaryGoal: {
            ...(campaign.gamePlan?.kpi1Name === 'CPC'
              ? {
                  CPCInAdvertiserCurrency: {
                    Amount: +campaign.gamePlan?.kpi1Value,
                    CurrencyCode: advertiser.geographicDetails.currency.value
                  }
                }
              : {}),
            ...(campaign.gamePlan?.kpi1Name === 'CPA'
              ? {
                  CPAInAdvertiserCurrency: {
                    Amount: +campaign.gamePlan?.kpi1Value,
                    CurrencyCode: advertiser.geographicDetails.currency.value
                  }
                }
              : {}),
            ...(campaign.gamePlan?.kpi1Name === 'CTR'
              ? {
                  CTRInPercent: +campaign.gamePlan?.kpi1Value
                }
              : {}),
            ...(campaign.gamePlan?.kpi1Name === 'VIEWABILITY'
              ? {
                  ViewabilityInPercent: +campaign.gamePlan?.kpi1Value
                }
              : {})
          },
          SecondaryGoal: {
            ...(campaign.gamePlan?.kpi2Name === 'CPC'
              ? {
                  CPCInAdvertiserCurrency: {
                    Amount: +campaign.gamePlan?.kpi2Value,
                    CurrencyCode: advertiser.geographicDetails.currency.value
                  }
                }
              : {}),
            ...(campaign.gamePlan?.kpi2Name === 'CPA'
              ? {
                  CPAInAdvertiserCurrency: {
                    Amount: +campaign.gamePlan?.kpi2Value,
                    CurrencyCode: advertiser.geographicDetails.currency.value
                  }
                }
              : {}),
            ...(campaign.gamePlan?.kpi2Name === 'CTR'
              ? {
                  CTRInPercent: +campaign.gamePlan?.kpi2Value
                }
              : {}),
            ...(campaign.gamePlan?.kpi2Name === 'VIEWABILITY'
              ? {
                  ViewabilityInPercent: +campaign.gamePlan?.kpi2Value
                }
              : {})
          },
          TertiaryGoal: {
            ...(campaign.gamePlan?.kpi3Name === 'CPC'
              ? {
                  CPCInAdvertiserCurrency: {
                    Amount: +campaign.gamePlan?.kpi3Value,
                    CurrencyCode: advertiser.geographicDetails.currency.value
                  }
                }
              : {}),
            ...(campaign.gamePlan?.kpi3Name === 'CPA'
              ? {
                  CPAInAdvertiserCurrency: {
                    Amount: +campaign.gamePlan?.kpi3Value,
                    CurrencyCode: advertiser.geographicDetails.currency.value
                  }
                }
              : {}),
            ...(campaign.gamePlan?.kpi3Name === 'CTR'
              ? {
                  CTRInPercent: +campaign.gamePlan?.kpi3Value
                }
              : {}),
            ...(campaign.gamePlan?.kpi3Name === 'VIEWABILITY'
              ? {
                  ViewabilityInPercent: +campaign.gamePlan?.kpi3Value
                }
              : {})
          },
          PurchaseOrderNumber: '',
          StartDate: campaign.flights[0].from,
          EndDate: campaign.flights[0].to
        },
        additionalfee: {
          StartDateUtc: campaign.flights[0].from,
          Fees: [
            {
              Description: 'Media Cost Markup',
              Amount: campaign.ioTarget?.totalMediaCost,
              FeeType: 'MediaPlusDataCostPercentage'
            },
            {
              Description: 'Data Fee',
              Amount: 0.18,
              FeeType: 'FeeCPM'
            }
          ],
          OwnerId: 'response[0].CampaignId',
          OwnerType: 'campaign'
        }
      };
    }

    // prepare platform specific info for XANDR
    if (platform === 'XANDR') {
      platform_specific_info['XANDR'] = {
        insertionOrder: {
          // advertiser_id: platformIdentifiers[PullingEntity.Advertiser]?.XANDR,
          // ...(action === QpApiAction.UPDATE &&
          // platformIdentifiers[PullingEntity.InsertionOrder]?.XANDR
          //   ? {
          //       id: platformIdentifiers[PullingEntity.InsertionOrder]?.XANDR
          //     }
          //   : {}),
          name: displayName,
          billing_code: campaign.billingCode,
          currency: advertiser.geographicDetails.currency.value,
          budget_type: 'revenue',
          budget_intervals: [
            // For seamless IO
            {
              start_date: moment(fromDate).utc().format('YYYY-MM-DD 00:00:00'),
              end_date: moment(toDate).utc().format('YYYY-MM-DD 00:00:00'),
              lifetime_pacing: true,
              enable_pacing: true,
              lifetime_budget: CommonUtils.multiply(
                (campaign.gamePlan?.budget || 0) / campaign.platforms.length,
                1
              )
            }
          ]
        }
      };
    }

    return {
      ...(action === QpApiAction.CREATE
        ? { advertiser_id: advertiser.qpId }
        : {}),
      ...(action === QpApiAction.CREATE ? { campaign_id: campaign.qpId } : {}),
      ...(action === QpApiAction.CREATE
        ? { game_plan_id: campaign.qpGamePlanId }
        : {}),
      format: {},
      pacing: {},
      targeting: {},
      display_name: displayName,
      entity_status: 'DRAFT',
      ...(action === QpApiAction.CREATE ? { flight: [] } : {}),
      platform_specific_info,
      syncs_with: [platform]
    };
  }

  // create insertion_order
  private async create(campaign: Campaign, platform: string, format: string) {
    const payload = this.mapCampaign(
      QpApiAction.CREATE,
      campaign,
      platform,
      format
    );

    return await ApiUtils.callApi({
      method: 'POST',
      url: `${this.baseUrl}/insertion-order`,
      headers: {
        API_TOKEN: this.apiToken
      },
      data: payload
    });
  }

  // update insertion_order
  private async update(
    qpId: number,
    campaign: Campaign,
    platform: string,
    format: string
  ) {
    const payload = this.mapCampaign(
      QpApiAction.UPDATE,
      campaign,
      platform,
      format
    );

    return await ApiUtils.callApi({
      method: 'PUT',
      url: `${this.baseUrl}/insertion-order/${qpId}`,
      headers: {
        API_TOKEN: this.apiToken
      },
      data: payload
    });
  }

  // publish insertion_order
  async publish(
    campaign: Campaign,
    platform: string,
    format: string,
    qpInsertionOrderId?: number
  ): Promise<number> {
    // check if campaign has qpInsertionOrderId
    if (qpInsertionOrderId) {
      await this.update(qpInsertionOrderId, campaign, platform, format);
    } else {
      const response = await this.create(campaign, platform, format);

      // update insertion_order qpInsertionOrderId
      qpInsertionOrderId = response.data.data.id;
    }

    return qpInsertionOrderId || -1;
  }
}
