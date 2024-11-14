import moment from 'moment';
import {
  Advertiser,
  Campaign,
  FilterItem,
  RetoolTarget
} from '../../../generated/client';
import {
  AGE_RANGES,
  DEVICE_TYPES,
  GENDER,
  GEO_TARGET_LEVEL,
  LANGUAGE,
  NonCategoryTypes,
  TIME_UNITS,
  VIEWABILITY,
  XANDR_GOAL_TYPE
} from '../../constants/campaign.constant';
import { QpApiAction } from '../../constants/qp-api-service.constant';
import logger from '../../logger';
import { ApiUtils } from '../../utils/api';
import { CommonUtils } from '../../utils/common';
import { PullingEntity, QpPullService } from './QpPullService';

export class QpLineItemService {
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
    platform: string;
    qpInsertionOrderId: number;
    qpLineItemId?: number;
  }) {
    // extract config
    const { campaign, platform, qpInsertionOrderId, qpLineItemId } = config;

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
        [platform],
        qpInsertionOrderId || 0
      );
    platformIdentifiers[PullingEntity.InsertionOrder] =
      insertionOrderPlatformIdentifiers;

    logger.info(
      `insertionOrderPlatformIdentifiers: ${JSON.stringify(insertionOrderPlatformIdentifiers)}`
    );

    // get line item platform identifiers if its already created
    if (qpLineItemId) {
      const lineItemPlatformIdentifiers =
        await this.qpPullService.getPlatformIdentifiers(
          PullingEntity.LineItem,
          [platform],
          qpLineItemId || 0,
          true // skip pulling platform id if not already created
        );
      platformIdentifiers[PullingEntity.LineItem] = lineItemPlatformIdentifiers;

      logger.info(
        `lineItemPlatformIdentifiers: ${JSON.stringify(lineItemPlatformIdentifiers)}`
      );
    }

    return platformIdentifiers;
  }

  private async getPlatformIdentifierLineItem(config: {
    qpId: number;
    platform: string;
  }) {
    // extract config
    const { qpId, platform } = config;

    return await this.qpPullService.getPlatformIdentifiers(
      PullingEntity.LineItem,
      [platform],
      qpId || 0
    );
  }

  // map campaign
  private mapCampaign(config: {
    action: QpApiAction;
    campaign: Campaign;
    platform: string;
    lineItemName: string;
    qpInsertionOrderId: number;
    format: string;
    category?: RetoolTarget;
    deviceName: string;
    deviceTargeting: FilterItem[];
    keywords?: string[];
    targetingType?: string;
  }) {
    // extract config
    const {
      action,
      campaign,
      platform,
      lineItemName,
      category,
      qpInsertionOrderId,
      format,
      deviceName,
      deviceTargeting,
      keywords,
      targetingType
    } = config;

    const advertiser: Advertiser = (campaign as any).advertiser;

    let fromDate = new Date(campaign.flights[0].from);
    let toDate = new Date(campaign.flights[0].to);

    const ageRanges = [
      { from: 18, to: 24 },
      { from: 25, to: 34 },
      { from: 35, to: 44 },
      { from: 45, to: 54 },
      { from: 55, to: 64 },
      { from: 65, to: 74 }
    ];

    // prepare platform specific info
    let platform_specific_info: any = {};

    const deviceType: any = deviceTargeting.map(
      (device) => DEVICE_TYPES['TTD'][device.value]
    );

    // prepare display name
    const displayName = CommonUtils.getName([
      format ?? '', // format
      NonCategoryTypes.includes(category?.type || '')
        ? 'RON'
        : category?.lineItemNameVariable ?? lineItemName, // ITT
      NonCategoryTypes.includes(category?.type || '') &&
      category?.lineItemNameVariable
        ? category?.lineItemNameVariable
        : 'PRT', // ATT
      campaign.locationListName ?? 'Geo-List', // GEO
      '/', // Buy Type
      GENDER['DV360'][
        campaign.demographicInformation.demographic.gender.value
      ] +
        campaign.demographicInformation.demographic.from +
        (campaign.demographicInformation.demographic.to == 74
          ? '+'
          : `-${campaign.demographicInformation.demographic.to}`), // Demo
      deviceName, // Device
      '/' // Environment
    ]);

    // prepare platform specific info for DV360
    if (platform === 'DV360') {
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

      // TODO: We are not using DeviceTargeting
      const deviceTargetingList = {
        targetingType: 'TARGETING_TYPE_DEVICE_TYPE',
        assignedTargetingOptions: deviceTargeting.map((device) => ({
          deviceTypeDetails: {
            deviceType: DEVICE_TYPES['DV360'][device.value]
          }
        }))
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
        assignedTargetingOptions:
          campaign.ioTarget?.categoryContentExclusion.map((category) => ({
            categoryDetails: {
              targetingOptionId: category.dv360Value,
              negative: true
            }
          })) || []
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

      platform_specific_info['DV360'] = {
        lineItem: {
          displayName,
          lineItemType: 'LINE_ITEM_TYPE_DISPLAY_DEFAULT',
          flight: {
            flightDateType: 'LINE_ITEM_FLIGHT_DATE_TYPE_CUSTOM',
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
          },
          budget: {
            budgetAllocationType: 'LINE_ITEM_BUDGET_ALLOCATION_TYPE_AUTOMATIC',
            budgetUnit: 'BUDGET_UNIT_CURRENCY',
            maxAmount: '500000000'
          },
          pacing: {
            pacingPeriod: 'PACING_PERIOD_FLIGHT',
            pacingType: 'PACING_TYPE_AHEAD',
            dailyMaxMicros: '10000'
          },
          frequencyCap: {
            unlimited: false,
            timeUnit: campaign.ioTarget?.limitFrequency.exposerFrequency.value,
            timeUnitCount: campaign.ioTarget?.limitFrequency.exposerPer,
            maxImpressions: campaign.ioTarget?.limitFrequency.frequency
          },
          partnerRevenueModel: {
            markupType:
              'PARTNER_REVENUE_MODEL_MARKUP_TYPE_TOTAL_MEDIA_COST_MARKUP',
            //prettier-ignore
            markupAmount: '' + (((1 / (1 - (campaign.ioTarget?.totalMediaCost || 0) /100 )) - 1) * 100000).toFixed()
          },
          conversionCounting: {},
          bidStrategy: {
            fixedBid: {
              bidAmountMicros:
                '' + CommonUtils.multiply(campaign.gamePlan?.rate, 1000000)
            }
          },
          integrationDetails: {
            integrationCode: 'SomeRandomIntegrationCode',
            details: 'Some Random Integration details'
          },
          targetingExpansion: {
            enableOptimizedTargeting: true
          },
          warningMessages: ['PARENT_INSERTION_ORDER_PAUSED'],
          reservationType: 'RESERVATION_TYPE_NOT_GUARANTEED',
          excludeNewExchanges: true
        },
        bulkEditAssignedTargetingOptions: {
          //advertiserId: platformIdentifiers[PullingEntity.Advertiser]?.DV360,
          lineItemIds: ['response[0].lineItemId'],
          deleteRequests: [],
          createRequests: [
            {
              targetingType,
              assignedTargetingOptions: [
                ...(targetingType == 'TARGETING_TYPE_KEYWORD'
                  ? [
                      ...(keywords || []).map((keyword) => ({
                        keywordDetails: {
                          keyword: keyword
                        }
                      }))
                    ]
                  : []),
                ...(targetingType == 'TARGETING_TYPE_CATEGORY'
                  ? [
                      {
                        categoryDetails: {
                          targetingOptionId: category?.platformId
                        }
                      }
                    ]
                  : []),
                ...(targetingType == 'TARGETING_TYPE_AUDIENCE_GROUP'
                  ? [
                      {
                        audienceGroupDetails: {
                          includedGoogleAudienceGroup: {
                            settings: [
                              {
                                googleAudienceId: category?.platformId
                              }
                            ]
                          }
                        }
                      }
                    ]
                  : [])
              ]
            },
            geoTargeting,
            demoTargeting,
            // deviceTargetingList, TODO: Need to check why device targeting is not working
            languageTargeting,
            categoryContentExclusions,
            viewabilityTargeting
          ]
        }
      };
    }

    // prepare platform specific info for TTD
    if (platform === 'TTD') {
      // const formatValues = campaign.gamePlan?.format?.map((f) => f.value) ?? [];
      platform_specific_info['TTD'] = {
        lineItem: {
          AdGroupName: displayName,
          IndustryCategoryId: 292,
          AdGroupCategory: {
            CategoryId: campaign.demographicInformation.category.value
          },
          RTBAttributes: {
            BudgetSettings: {
              DailyBudget: {
                Amount: 1,
                CurrencyCode: advertiser.geographicDetails.currency.value
              },
              PacingMode: 'PaceToEndOfDay'
            },
            BaseBidCPM: {
              Amount: CommonUtils.multiply(campaign.gamePlan?.rate, 0.75),
              CurrencyCode: advertiser.geographicDetails.currency.value
            },
            MaxBidCPM: {
              Amount: campaign.gamePlan?.rate,
              CurrencyCode: advertiser.geographicDetails.currency.value
            },
            AudienceTargeting: {
              CrossDeviceVendorListForAudience: [
                {
                  CrossDeviceVendorId: 11,
                  CrossDeviceVendorName: 'Identity Alliance'
                }
              ],
              // AudienceAcceleratorExclusionsEnabled: false,
              ...(category?.type === 'Affinity'
                ? {
                    TargetInterestSettingsEnabled: true,
                    TargetInterestSettings: {
                      CategoryId: category?.platformId,
                      CategoryName: category?.fullName
                    }
                  }
                : {
                    TargetDemographicSettingsEnabled: true,
                    TargetDemographicSettings: {
                      CountryCode:
                        advertiser.geographicDetails.locations.label.includes(
                          'Canada'
                        )
                          ? 'CA'
                          : 'US',
                      DataRateType: 'CPM',
                      EndAge:
                        AGE_RANGES[platform]['to'][
                          campaign.demographicInformation.demographic.to
                        ],
                      StartAge:
                        AGE_RANGES[platform]['from'][
                          campaign.demographicInformation.demographic.from
                        ],
                      Gender:
                        campaign.demographicInformation.demographic.gender.value
                    }
                  })
            },
            ROIGoal: {
              CPAInAdvertiserCurrency: {
                Amount: 0.2,
                CurrencyCode: advertiser.geographicDetails.currency.value
              }
            },
            CreativeIds: []
          },
          NewFrequencyConfigs: [
            {
              CounterId: '1',
              CounterName: 'First frequency config',
              FrequencyCap: campaign.ioTarget?.limitFrequency.frequency,
              // FrequencyGoal: campaign.ioTarget?.limitFrequency.exposerPer, // Zach asked to remove this value.
              ResetIntervalInMinutes:
                CommonUtils.multiply(
                  campaign.ioTarget?.limitFrequency.exposerPer,
                  TIME_UNITS[
                    campaign.ioTarget?.limitFrequency.exposerFrequency.value ||
                      1
                  ]
                ) > 1440
                  ? CommonUtils.multiply(
                      campaign.ioTarget?.limitFrequency.exposerPer,
                      TIME_UNITS[
                        campaign.ioTarget?.limitFrequency.exposerFrequency
                          .value || 1
                      ]
                    )
                  : 1440
            }
          ],
          NewBidLists: [
            {
              BidLines: [
                ...deviceType.map((device: any) => ({
                  DeviceType: device
                }))
              ],
              BidListAdjustmentType: 'TargetList',
              Name: `Device List `,
              IsDefaultForDimension: false,
              IsEnabled: true,
              ResolutionType: 'ApplyMultiplyAdjustment'
            },
            {
              BidLines: [
                ...(
                  (campaign as any).locationList?.platforms?.TTD?.include || []
                ).map((geoTargetId: string) => ({
                  GeoSegmentId: geoTargetId
                }))
              ],
              BidListAdjustmentType: 'TargetList',
              Name: `Geo List Inclusion`,
              IsDefaultForDimension: false,
              IsEnabled: true,
              ResolutionType: 'ApplyMultiplyAdjustment'
            },
            ...((campaign as any).locationList?.platforms?.TTD?.exclude
              ? [
                  {
                    BidLines: [
                      ...(
                        (campaign as any).locationList?.platforms?.TTD
                          ?.exclude || []
                      ).map((geoTargetId: string) => ({
                        GeoSegmentId: geoTargetId
                      }))
                    ],
                    BidListAdjustmentType: 'BlockList',
                    Name: `Geo List Exclusion`,
                    IsDefaultForDimension: false,
                    IsEnabled: false,
                    ResolutionType: 'ApplyMultiplyAdjustment'
                  }
                ]
              : []),
            {
              BidLines: [
                {
                  LanguageId: LANGUAGE[platform][campaign.language || '']
                }
              ],
              BidListAdjustmentType: 'TargetList',
              Name: 'Language List',
              IsDefaultForDimension: false,
              IsEnabled: true,
              ResolutionType: 'ApplyMultiplyAdjustment'
            },
            {
              BidLines: [
                ...(campaign.ioTarget?.categoryContentExclusion.map(
                  (category) => {
                    return {
                      UniversalCategoryTaxonomyId: category.ttdValue
                    };
                  }
                ) || [])
              ],
              BidListAdjustmentType: 'BlockList',
              Name: `CategoryContentExclusion List`,
              IsDefaultForDimension: false,
              IsEnabled: true,
              ResolutionType: 'ApplyMultiplyAdjustment'
            },
            ...(category?.type === 'CAT'
              ? [
                  {
                    BidLines: [
                      {
                        UniversalCategoryTaxonomyId: category?.platformId
                      }
                    ],
                    BidListAdjustmentType: 'TargetList',
                    Name: `BidList Category ${category.fullName}`,
                    IsDefaultForDimension: false,
                    IsEnabled: true,
                    ResolutionType: 'ApplyMultiplyAdjustment'
                  }
                ]
              : []),
            // To map the Display and Video CategoryId we have called category/query api
            ...(format.includes('DIS') //Display
              ? [
                  {
                    BidLines: [
                      ...(campaign.ioTarget?.viewability == 40
                        ? [
                            {
                              IntegralViewabilityCategoryId: 'integral-940'
                            }
                          ]
                        : []),
                      ...(campaign.ioTarget?.viewability == 50
                        ? [
                            {
                              IntegralViewabilityCategoryId: 'integral-950'
                            }
                          ]
                        : []),
                      ...(campaign.ioTarget?.viewability == 60
                        ? [
                            {
                              IntegralViewabilityCategoryId: 'integral-960'
                            }
                          ]
                        : []),
                      ...(campaign.ioTarget?.viewability == 70
                        ? [
                            {
                              IntegralViewabilityCategoryId: 'integral-970'
                            }
                          ]
                        : [])
                    ],
                    BidListAdjustmentType: 'TargetList',
                    Name: 'Display Viewability',
                    IsDefaultForDimension: false,
                    IsEnabled: true,
                    ResolutionType: 'ApplyMultiplyAdjustment'
                  },
                  {
                    BidLines: [
                      {
                        IntegralPageQualityCategoryId: 'integral-301'
                      },
                      {
                        IntegralPageQualityCategoryId: 'integral-4016'
                      }
                    ],
                    BidListAdjustmentType: 'TargetList',
                    Name: 'Display Ad Fraud Prevention',
                    IsDefaultForDimension: false,
                    IsEnabled: true,
                    ResolutionType: 'ApplyMultiplyAdjustment'
                  },
                  {
                    BidLines: [
                      {
                        IntegralBrandSafetyCategoryId: 'integral-not-101'
                      },
                      {
                        IntegralBrandSafetyCategoryId: 'integral-not-102'
                      },
                      {
                        IntegralBrandSafetyCategoryId: 'integral-not-103'
                      },
                      {
                        IntegralBrandSafetyCategoryId: 'integral-not-104'
                      },
                      {
                        IntegralBrandSafetyCategoryId: 'integral-not-107'
                      },
                      {
                        IntegralBrandSafetyCategoryId: 'integral-not-108'
                      },
                      {
                        IntegralBrandSafetyCategoryId: 'integral-not-4008'
                      },
                      {
                        IntegralBrandSafetyCategoryId: 'integral-not-4009'
                      },
                      {
                        IntegralBrandSafetyCategoryId: 'integral-not-109'
                      },
                      {
                        IntegralBrandSafetyCategoryId: 'integral-not-110'
                      },
                      {
                        IntegralBrandSafetyCategoryId: 'integral-not-105'
                      },
                      {
                        IntegralBrandSafetyCategoryId: 'integral-not-106'
                      },
                      {
                        IntegralBrandSafetyCategoryId: 'integral-not-111'
                      },
                      {
                        IntegralBrandSafetyCategoryId: 'integral-not-112'
                      },
                      {
                        IntegralBrandSafetyCategoryId: 'integral-not-531'
                      },
                      {
                        IntegralBrandSafetyCategoryId: 'integral-not-532'
                      }
                    ],
                    BidListAdjustmentType: 'BlockList',
                    Name: 'Display Brand Safety',
                    IsDefaultForDimension: false,
                    IsEnabled: true,
                    ResolutionType: 'ApplyMultiplyAdjustment'
                  }
                ]
              : []),
            ...(format.includes('VID') //Video
              ? [
                  {
                    BidLines: [
                      ...(campaign.ioTarget?.viewability == 40
                        ? [
                            {
                              IntegralVideoViewabilityCategoryId: 'integral-840'
                            }
                          ]
                        : []),
                      ...(campaign.ioTarget?.viewability == 50
                        ? [
                            {
                              IntegralVideoViewabilityCategoryId: 'integral-850'
                            }
                          ]
                        : []),
                      ...(campaign.ioTarget?.viewability == 60
                        ? [
                            {
                              IntegralVideoViewabilityCategoryId: 'integral-860'
                            }
                          ]
                        : []),
                      ...(campaign.ioTarget?.viewability == 70
                        ? [
                            {
                              IntegralVideoViewabilityCategoryId: 'integral-870'
                            }
                          ]
                        : [])
                    ],
                    BidListAdjustmentType: 'TargetList',
                    Name: 'Video Viewability',
                    IsDefaultForDimension: false,
                    IsEnabled: true,
                    ResolutionType: 'ApplyMultiplyAdjustment'
                  },
                  {
                    BidLines: [
                      {
                        IntegralVideoPageQualityCategoryId: 'integral-408'
                      },
                      {
                        IntegralVideoPageQualityCategoryId: 'integral-8016'
                      }
                    ],
                    BidListAdjustmentType: 'TargetList',
                    Name: 'Video Ad Fraud Prevention',
                    IsDefaultForDimension: false,
                    IsEnabled: true,
                    ResolutionType: 'ApplyMultiplyAdjustment'
                  },
                  {
                    BidLines: [
                      {
                        IntegralVideoBrandSafetyCategoryId: 'integral-not-535'
                      },
                      {
                        IntegralVideoBrandSafetyCategoryId: 'integral-not-536'
                      },
                      {
                        IntegralVideoBrandSafetyCategoryId: 'integral-not-537'
                      },
                      {
                        IntegralVideoBrandSafetyCategoryId: 'integral-not-538'
                      },
                      {
                        IntegralVideoBrandSafetyCategoryId: 'integral-not-541'
                      },
                      {
                        IntegralVideoBrandSafetyCategoryId: 'integral-not-542'
                      },
                      {
                        IntegralVideoBrandSafetyCategoryId: 'integral-not-8008'
                      },
                      {
                        IntegralVideoBrandSafetyCategoryId: 'integral-not-8009'
                      },
                      {
                        IntegralVideoBrandSafetyCategoryId: 'integral-not-543'
                      },
                      {
                        IntegralVideoBrandSafetyCategoryId: 'integral-not-544'
                      },
                      {
                        IntegralVideoBrandSafetyCategoryId: 'integral-not-539'
                      },
                      {
                        IntegralVideoBrandSafetyCategoryId: 'integral-not-540'
                      },
                      {
                        IntegralVideoBrandSafetyCategoryId: 'integral-not-545'
                      },
                      {
                        IntegralVideoBrandSafetyCategoryId: 'integral-not-546'
                      },
                      {
                        IntegralVideoBrandSafetyCategoryId: 'integral-not-533'
                      },
                      {
                        IntegralVideoBrandSafetyCategoryId: 'integral-not-534'
                      }
                    ],
                    BidListAdjustmentType: 'BlockList',
                    Name: 'Video Brand Safety',
                    IsDefaultForDimension: false,
                    IsEnabled: true,
                    ResolutionType: 'ApplyMultiplyAdjustment'
                  }
                ]
              : [])
          ],
          Availability: 'Available'
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
          OwnerId: 'response[0].AdGroupId',
          OwnerType: 'adgroup'
        }
      };
    }

    // prepare platform specific info for XANDR
    if (platform === 'XANDR') {
      const selectedFrom = campaign.demographicInformation.demographic.from;
      const selectedTo = campaign.demographicInformation.demographic.to;

      const locationListDetails = (campaign as any).locationList;
      const locationList = locationListDetails?.platforms?.XANDR?.include || [];

      // Country targeting
      let countryTargeting = {};
      if (
        locationListDetails?.level === GEO_TARGET_LEVEL.COUNTRY &&
        locationList.length
      ) {
        countryTargeting = {
          country_action: 'include',
          country_targets: locationList.map((location: string) => {
            return {
              id: +location
            };
          })
        };
      }

      // Region targeting
      let regionTargeting = {};
      if (
        locationListDetails?.level === GEO_TARGET_LEVEL.REGION &&
        locationList.length
      ) {
        regionTargeting = {
          region_action: 'include',
          region_targets: locationList.map((location: string) => {
            return {
              id: +location
            };
          })
        };
      }

      // City targeting
      let cityTargeting = {};
      if (
        locationListDetails?.level === GEO_TARGET_LEVEL.CITY &&
        locationList.length
      ) {
        cityTargeting = {
          city_action: 'include',
          city_targets: locationList.map((location: string) => {
            return {
              id: +location
            };
          })
        };
      }

      const ageTargeting = {
        age_targets: {
          allow_unknown: true,
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

      platform_specific_info['XANDR'] = {
        lineItem: {
          // advertiser_id: platformIdentifiers[PullingEntity.Advertiser]?.XANDR,
          // insertion_order_id:
          //   platformIdentifiers[PullingEntity.InsertionOrder]?.XANDR,
          // ...(action === QpApiAction.UPDATE &&
          // platformIdentifiers[PullingEntity.LineItem]?.XANDR
          //   ? { id: platformIdentifiers[PullingEntity.LineItem]?.XANDR }
          //   : {}),
          name: displayName,
          profile_id: 'response[0].response.id',
          currency: advertiser.geographicDetails.currency.value,
          budget_intervals: [
            {
              start_date: moment(fromDate).utc().format('YYYY-MM-DD 00:00:00'),
              end_date: moment(toDate).utc().format('YYYY-MM-DD 00:00:00'),
              enable_pacing: true,
              lifetime_budget: CommonUtils.multiply(
                (campaign.gamePlan?.budget || 0) / campaign.platforms.length,
                1
              ),
              lifetime_pacing: true
            }
          ],
          goal_type: XANDR_GOAL_TYPE[campaign.gamePlan?.kpi1Name || 0],
          // goal_value: +(campaign.gamePlan?.kpi1Value || 0),
          line_item_type: 'standard_v2',
          revenue_type: 'cost_plus_margin',
          //prettier-ignore
          revenue_value: ((((1 / (1 - (campaign.ioTarget?.totalMediaCost || 0) /100 )) - 1) * 100)/100).toFixed(4),
          valuation: {
            goal_target:
              XANDR_GOAL_TYPE[campaign.gamePlan?.kpi1Name || 0] === 'cpc'
                ? 2
                : XANDR_GOAL_TYPE[campaign.gamePlan?.kpi1Name || 0] === 'ctr'
                  ? 0.001
                  : null,
            goal_threshold:
              XANDR_GOAL_TYPE[campaign.gamePlan?.kpi1Name || 0] === 'cpc'
                ? 2
                : XANDR_GOAL_TYPE[campaign.gamePlan?.kpi1Name || 0] === 'ctr'
                  ? 0.001
                  : null,
            campaign_group_valuation_strategy: 'prospecting',
            max_avg_cpm: +(campaign.gamePlan?.kpi1Value || 0),
            min_avg_cpm: CommonUtils.multiply(
              campaign.gamePlan?.kpi1Value,
              0.75
            )
          },
          goal_pixels:
            XANDR_GOAL_TYPE[campaign.gamePlan?.kpi1Name || 0] == 'cpa'
              ? [
                  {
                    id: 932952, //TODO: Map goal_pixels id here
                    post_click_goal_threshold: 10,
                    post_videw_goal_threshold: 10,
                    post_click_goal_target: 10
                  }
                ]
              : null,
          auction_event: {
            kpi_auction_event_type:
              XANDR_GOAL_TYPE[campaign.gamePlan?.kpi1Name || 0] === 'none'
                ? 'view'
                : 'impression',
            kpi_auction_event_type_code:
              XANDR_GOAL_TYPE[campaign.gamePlan?.kpi1Name || 0] === 'none'
                ? 'view_display_50pv1s_an'
                : 'impression',
            kpi_auction_type_id:
              XANDR_GOAL_TYPE[campaign.gamePlan?.kpi1Name || 0] === 'none'
                ? 2
                : 1,
            kpi_value:
              XANDR_GOAL_TYPE[campaign.gamePlan?.kpi1Name || 0] === 'none'
                ? (
                    ((campaign.gamePlan?.rate || 0) /
                      +(campaign.gamePlan?.kpi1Value || 0)) *
                    100
                  ).toFixed(2)
                : null
          },
          inventory_discovery:
            XANDR_GOAL_TYPE[campaign.gamePlan?.kpi1Name || 0] === 'cpc' ||
            XANDR_GOAL_TYPE[campaign.gamePlan?.kpi1Name || 0] === 'ctr'
              ? {
                  use_ranked_discovery: true,
                  fail_criteria_type: 'booked_revenue',
                  fail_criteria_amount: +(campaign.gamePlan?.kpi1Value || 0)
                }
              : null,
          ad_types: ['banner'],
          creative_distribution_type: 'ctr-optimized',
          manage_creative: true,
          prefer_delivery_over_performance: true,
          viewability_vendor: 'appnexus',
          partner_fees: [{ id: 618484 }, { id: 618595 }]
          // insertion_orders: [
          //   {
          //     id: platformIdentifiers[PullingEntity.InsertionOrder]?.XANDR
          //   }
          // ]
        },
        profile: {
          // advertiser_id: platformIdentifiers[PullingEntity.Advertiser].XANDR,
          // name: 'test profile by vasanta!', //TODO: What will be the name of profile
          // max_lifetime_imps: campaign.ioTarget?.limitFrequency.frequency,
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
          engagement_rate_targets: [
            {
              engagement_rate_type: 'view',
              engagement_rate_pct: campaign.ioTarget?.viewability
            }
          ],
          supply_type_targets: ['mobile_web', 'web'],
          ads_txt_authorized_only: true,
          segment_group_targets: [
            {
              boolean_operator: 'or',
              segments: [
                {
                  id: 20440138
                },
                {
                  id: 20440479
                },
                {
                  id: 8900447
                },
                {
                  id: 591086
                }
              ]
            },
            {
              boolean_operator: 'or',
              segments: [
                ...ageRanges
                  .filter(
                    (range) =>
                      range.from >= selectedFrom && range.to <= selectedTo
                  )
                  .map((range) =>
                    range.from == 18 && range.to == 24
                      ? {
                          id: 106006
                        }
                      : range.from == 25 && range.to == 34
                        ? {
                            id: 106007
                          }
                        : range.from == 35 && range.to == 44
                          ? {
                              id: 106008
                            }
                          : range.from == 45 && range.to == 54
                            ? {
                                id: 106010
                              }
                            : range.from == 55 && range.to == 64
                              ? {
                                  id: 106011
                                }
                              : {
                                  id: 106012
                                }
                  )
              ]
            },
            ...(campaign.demographicInformation.demographic.gender.value !=
            'Both'
              ? [
                  {
                    boolean_operator: 'or',
                    segments: [
                      ...(campaign.demographicInformation.demographic.gender
                        .value == 'Female'
                        ? [
                            {
                              id: 106004
                            }
                          ]
                        : []),
                      ...(campaign.demographicInformation.demographic.gender
                        .value == 'Male'
                        ? [
                            {
                              id: 106005
                            }
                          ]
                        : [])
                    ]
                  }
                ]
              : [])
            // TODO
            // {
            //   boolean_operator: 'or',
            //   segments: [
            //     {
            //       id: 30483350
            //     }
            //   ]
            // }
          ],
          ...ageTargeting,
          ...genderTargeting,
          ...deviceTargetingList,
          ...languageTargeting,
          ...countryTargeting,
          ...regionTargeting,
          ...cityTargeting
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
      ...(action === QpApiAction.CREATE
        ? { insertion_order_id: qpInsertionOrderId }
        : {}),
      display_name: displayName,
      entity_status: 'DRAFT',
      ...(action === QpApiAction.CREATE ? { flight: [] } : {}),
      platform_specific_info,
      syncs_with: [platform]
    };
  }

  // create line_item
  private async create(config: {
    campaign: Campaign;
    platform: string;
    lineItemName: string;
    category?: RetoolTarget;
    qpInsertionOrderId: number;
    format: string;
    deviceName: string;
    deviceTargeting: FilterItem[];
    keywords?: string[];
    targetingType?: string;
  }) {
    const payload = this.mapCampaign({
      action: QpApiAction.CREATE,
      ...config
    });

    return await ApiUtils.callApi({
      method: 'POST',
      url: `${this.baseUrl}/line-item`,
      headers: {
        API_TOKEN: this.apiToken
      },
      data: payload
    });
  }

  // update line_item
  private async update(config: {
    qpId: number;
    campaign: Campaign;
    platform: string;
    lineItemName: string;
    qpInsertionOrderId: number;
    deviceName: string;
    deviceTargeting: FilterItem[];
    format: string;
    category?: RetoolTarget;
    keywords?: string[];
    targetingType?: string;
  }) {
    const payload = this.mapCampaign({
      action: QpApiAction.UPDATE,
      ...config
    });

    return await ApiUtils.callApi({
      method: 'PUT',
      url: `${this.baseUrl}/line-item/${config.qpId}`,
      headers: {
        API_TOKEN: this.apiToken
      },
      data: payload
    });
  }

  // publish line_item
  async publish(config: {
    campaign: Campaign;
    platform: string;
    lineItemName: string;
    qpInsertionOrderId: number;
    deviceName: string;
    deviceTargeting: FilterItem[];
    qpId?: number;
    format: string;
    category?: RetoolTarget;
    keywords?: string[];
    targetingType?: string;
  }): Promise<number> {
    // extract config
    let { qpId, platform } = config;

    // check if campaign has qpLineItemId
    if (qpId) {
      await this.update({
        ...config,
        qpId
      });
    } else {
      const response = await this.create({
        ...config
      });

      // update line_item qpLineItemId
      qpId = response.data.data.id;
    }

    return qpId || -1;
  }
}
