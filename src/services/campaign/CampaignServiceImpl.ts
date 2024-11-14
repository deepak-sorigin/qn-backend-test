import {
  Advertiser,
  Campaign,
  ENTITY_STATUS,
  RetoolTarget,
  TargetSection
} from '../../../generated/client';
import {
  CONTENT_THEME_KEYWORD,
  DEVICES,
  TARGETING_TYPES
} from '../../constants/campaign.constant';
import { prismaMain } from '../../database/prisma';
import logger from '../../logger';
import { QpAdvertiserService } from '../qp-services/QpAdvertiserService';
import { QpCampaignService } from '../qp-services/QpCampaignService';
import { QpEditAssignedTargetingService } from '../qp-services/QpEditAssignedTargetingService';
import { QpGamePlanService } from '../qp-services/QpGamePlanService';
import { QpInsertionOrderService } from '../qp-services/QpInsertionOrderService';
import { QpLineItemService } from '../qp-services/QpLineItemsService';
import { CampaignService } from './CampaignService';

export class CampaignServiceImpl implements CampaignService {
  private qpAdvertiserService: QpAdvertiserService;
  private qpCampaignService: QpCampaignService;
  private qpGamePlanService: QpGamePlanService;
  private qpInsertionOrderService: QpInsertionOrderService;
  private qpLineItemService: QpLineItemService;
  private qpEditAssignedTargetingService: QpEditAssignedTargetingService;

  constructor(
    qpAdvertiserService: QpAdvertiserService,
    qpCampaignService: QpCampaignService,
    qpGamePlanService: QpGamePlanService,
    qpInsertionOrderService: QpInsertionOrderService,
    qpLineItemService: QpLineItemService,
    qpEditAssignedTargetingService: QpEditAssignedTargetingService
  ) {
    this.qpAdvertiserService = qpAdvertiserService;
    this.qpCampaignService = qpCampaignService;
    this.qpGamePlanService = qpGamePlanService;
    this.qpInsertionOrderService = qpInsertionOrderService;
    this.qpLineItemService = qpLineItemService;
    this.qpEditAssignedTargetingService = qpEditAssignedTargetingService;
  }

  async create(campaign: Campaign): Promise<Campaign> {
    // create record in db
    return await prismaMain.campaign.create({
      data: campaign,
      include: {
        advertiser: true,
        locationList: true
      }
    });
  }

  async fetch(): Promise<Campaign[]> {
    return await prismaMain.campaign.findMany({
      include: {
        advertiser: true,
        locationList: true
      }
    });
  }

  async update(id: string, data: Campaign): Promise<Campaign> {
    // check given id exists
    const foundCampaign = await prismaMain.campaign.findFirst({
      where: {
        id
      }
    });

    // throw error if not found
    if (!foundCampaign) {
      throw new Error('Campaign not found.');
    }

    // update the record
    return await prismaMain.campaign.update({
      data,
      where: {
        id
      },
      include: {
        advertiser: true,
        locationList: true
      }
    });
  }

  async fetchById(id: string): Promise<Campaign> {
    // check given id exists
    const foundCampaign = await prismaMain.campaign.findFirst({
      where: {
        id
      },
      include: {
        advertiser: true,
        locationList: true
      }
    });

    // throw error if not found
    if (!foundCampaign) {
      throw new Error('Campaign not found.');
    }

    return foundCampaign;
  }

  // publish campaign
  async publish(id: string): Promise<Campaign> {
    // fetch advertiser by id
    let campaign = await this.fetchById(id);
    const advertiser: Advertiser = (campaign as any).advertiser;

    try {
      // Create Advertiser
      const updatedAdvertiser =
        await this.qpAdvertiserService.publish(campaign);

      // exclude advertiser id for update
      const { id: _, ...fieldsToUpdateAdvertiser } = updatedAdvertiser;

      // update advertiser in db
      await prismaMain.advertiser.update({
        data: fieldsToUpdateAdvertiser,
        where: {
          id: updatedAdvertiser.id
        }
      });

      // *************************************************************************

      // Create Campaign
      campaign = await this.qpCampaignService.publish(campaign);

      // update advertiser as publish success
      await prismaMain.advertiser.update({
        data: {
          ...fieldsToUpdateAdvertiser,
          entityStatus: ENTITY_STATUS.PUBLISHED
        },
        where: {
          id: updatedAdvertiser.id
        }
      });

      // exclude campaign id for update
      var {
        id: __,
        advertiser: ___,
        locationList: ____,
        ...fieldsToUpdateCampaign
      } = campaign as any;

      // update campaign in db
      campaign = await prismaMain.campaign.update({
        data: fieldsToUpdateCampaign,
        where: {
          id: campaign.id
        },
        include: {
          advertiser: true,
          locationList: true
        }
      });

      // *************************************************************************

      // Create GamePlan
      campaign = await this.qpGamePlanService.publish(campaign);

      // exclude campaign id for update
      var {
        id: ____,
        advertiser: _____,
        locationList: ______,
        ...fieldsToUpdateCampaign
      } = campaign as any;

      // update gamePlan in db
      campaign = await prismaMain.campaign.update({
        data: fieldsToUpdateCampaign,
        where: {
          id: campaign.id
        },
        include: {
          advertiser: true,
          locationList: true
        }
      });

      // *************************************************************************

      // Create InsertionOrder

      for (let platform of campaign.platforms) {
        for (let format of campaign.gamePlan?.format || []) {
          // Check IO is already created
          const foundInsertionOrder = campaign.insertionOrders.find(
            (item) =>
              item.platform === platform.value && item.format === format.value
          );

          const updatedInsertionOrderId =
            await this.qpInsertionOrderService.publish(
              campaign,
              platform.value,
              format.value,
              foundInsertionOrder?.qpInsertionOrderId
            );

          // Push new IO entry to IOs
          if (!foundInsertionOrder) {
            campaign.insertionOrders.push({
              platform: platform.value,
              format: format.value,
              qpInsertionOrderId: updatedInsertionOrderId
            });
          }

          // exclude campaign id for update
          var {
            id: ______,
            advertiser: _______,
            locationList: ________,
            ...fieldsToUpdateCampaign
          } = campaign as any;

          // update insertionOrder in db
          campaign = await prismaMain.campaign.update({
            data: fieldsToUpdateCampaign,
            where: {
              id: campaign.id
            },
            include: {
              advertiser: true,
              locationList: true
            }
          });

          // check device targeting length
          // if device targeting has all the devices then create one set of LI
          // else create separate set of line items for each device
          let deviceTargetingConfig = [];
          const selectedDevicesPMT = campaign.ioTarget?.deviceTargeting?.map(
            (item) => item.value
          );
          if (
            (campaign.ioTarget?.deviceTargeting || []).length == DEVICES.TOTAL
          ) {
            deviceTargetingConfig = [
              {
                deviceName: DEVICES.ALL,
                deviceTargeting: campaign.ioTarget?.deviceTargeting || []
              }
            ];
          } else if (
            selectedDevicesPMT?.includes(DEVICES.VALUES.PC) &&
            selectedDevicesPMT?.includes(DEVICES.VALUES.MOB) &&
            selectedDevicesPMT?.includes(DEVICES.VALUES.TAB)
          ) {
            deviceTargetingConfig = [
              {
                deviceName: DEVICES.PMT,
                deviceTargeting: campaign.ioTarget?.deviceTargeting || []
              }
            ];
          } else {
            deviceTargetingConfig = (
              campaign.ioTarget?.deviceTargeting || []
            ).map((item) => {
              return {
                deviceName: (DEVICES.TYPES as any)[item.value],
                deviceTargeting: [item]
              };
            });
          }

          // create LI for each device
          for (let deviceConfig of deviceTargetingConfig) {
            // *************************************************************************

            // *********Create LineItem for Keywords on DV360*********
            let mergedKeywords: string[] = [
              ...(campaign.contentThemes?.keywordsFromAdvertiser || []),
              ...(campaign.contentThemes?.keywordsFromCategory || []),
              ...(campaign.contentThemes?.keywordsFromCompetitor || []),
              ...(campaign.contentThemes?.keywordsFromCultureVector || [])
            ];
            // remove duplicates
            mergedKeywords = [...new Set(mergedKeywords)];

            if (platform.value == 'DV360') {
              try {
                // Check LI is already created
                const foundLineItem = campaign.lineItems.find(
                  (item) =>
                    item.platform === platform.value &&
                    item.keyword === CONTENT_THEME_KEYWORD &&
                    item.format === format.value &&
                    item.device === deviceConfig.deviceName
                );

                // Create LI for given (platform, keyword)
                const updatedLineItemId = await this.qpLineItemService.publish({
                  campaign,
                  platform: platform.value,
                  lineItemName: 'CNT',
                  qpInsertionOrderId: updatedInsertionOrderId,
                  qpId: foundLineItem?.qpLineItemId,
                  format: format.value,
                  deviceName: deviceConfig.deviceName,
                  deviceTargeting: deviceConfig.deviceTargeting,
                  keywords: mergedKeywords,
                  targetingType: 'TARGETING_TYPE_KEYWORD'
                });

                // Push new LI entry to LIs
                if (!foundLineItem) {
                  campaign.lineItems.push({
                    platform: platform.value,
                    keyword: CONTENT_THEME_KEYWORD,
                    qpLineItemId: updatedLineItemId,
                    format: format.value,
                    device: deviceConfig.deviceName
                  });
                }

                // exclude campaign id for update
                var {
                  id: ________,
                  advertiser: _________,
                  locationList: __________,
                  ...fieldsToUpdateCampaign
                } = campaign as any;

                // update lineItem in db
                campaign = await prismaMain.campaign.update({
                  data: fieldsToUpdateCampaign,
                  where: {
                    id: campaign.id
                  },
                  include: {
                    advertiser: true,
                    locationList: true
                  }
                });

                // EditAssignedTargeting
                // await this.qpEditAssignedTargetingService.publish({
                //   campaign,
                //   keywords: mergedKeywords,
                //   qpLineItemId: updatedLineItemId,
                //   targetingType: 'TARGETING_TYPE_KEYWORD',
                //   qpInsertionOrderId: updatedInsertionOrderId,
                //   deviceTargeting: deviceConfig.deviceTargeting
                // });
              } catch (error) {
                logger.error(
                  'Error while creating line item for keywords',
                  error
                );
              }
            }

            // *********Create LineItems for 360-targeting categories on DV360 and TTD*********
            let categories: RetoolTarget[] = [];
            // merge all 360 targeting categories
            if (campaign.targets) {
              // iterate over all targets
              for (const key in campaign.targets) {
                const targets = ((<any>campaign.targets)[key] ||
                  []) as TargetSection[];

                // iterate over all sections
                for (let section of targets) {
                  if (section.targets?.length) {
                    categories.push(...section.targets);
                  }
                }
              }
            }

            categories = categories.filter((category) => {
              if (
                platform.value == category.platform &&
                category.platform === 'TTD'
              ) {
                return ['Affinity', 'CAT'].includes(category.type);
              } else if (platform.value == 'XANDR') {
                // if (
                //   advertiser.geographicDetails.locations.label.includes(
                //     'Canada'
                //   ) &&
                //   ['BELL', 'Bell'].includes(category.platform)
                // ) {
                //   return ['Affinity', 'Apps', 'Company', 'Interest'].includes(
                //     category.type
                //   );
                // } else
                if (
                  // advertiser.geographicDetails.locations.label.includes(
                  //   'United States'
                  // ) &&
                  ['XND'].includes(category.platform)
                ) {
                  return [
                    'Environics',
                    'INM',
                    '3PD Dstillery',
                    'Dstillery Predictive Location'
                  ].includes(category.type);
                }
              }
              return platform.value == category.platform;
            });

            // remove duplicates
            categories = categories.filter((category, index, self) =>
              index === self.findIndex((c) => c.fullName === category.fullName)
            );

            // create LI for each category
            for (let category of categories) {
              try {
                // Check LI is already created
                const foundLineItem = campaign.lineItems.find(
                  (item) =>
                    item.platform === platform.value &&
                    item.keyword === category.fullName &&
                    item.format === format.value &&
                    item.device === deviceConfig.deviceName
                );

                // Create LI for given (platform, category)
                const updatedLineItemId = await this.qpLineItemService.publish({
                  campaign,
                  platform: platform.value,
                  lineItemName: category.lineItemNameVariable,
                  qpInsertionOrderId: updatedInsertionOrderId,
                  qpId: foundLineItem?.qpLineItemId,
                  format: format.value,
                  category,
                  deviceName: deviceConfig.deviceName,
                  deviceTargeting: deviceConfig.deviceTargeting,
                  targetingType:
                    TARGETING_TYPES[category.type] || 'TARGETING_TYPE_CATEGORY'
                });

                // Push new LI entry to LIs
                if (!foundLineItem) {
                  campaign.lineItems.push({
                    platform: platform.value,
                    keyword: category.fullName,
                    qpLineItemId: updatedLineItemId,
                    format: format.value,
                    device: deviceConfig.deviceName
                  });
                }

                // exclude campaign id for update
                var {
                  id: ________,
                  advertiser: _________,
                  locationList: __________,
                  ...fieldsToUpdateCampaign
                } = campaign as any;

                // update lineItem in db
                campaign = await prismaMain.campaign.update({
                  data: fieldsToUpdateCampaign,
                  where: {
                    id: campaign.id
                  },
                  include: {
                    advertiser: true,
                    locationList: true
                  }
                });

                // if (category.platform == 'DV360') {
                //   // EditAssignedTargeting
                //   await this.qpEditAssignedTargetingService.publish({
                //     campaign,
                //     keywords: [category.platformId],
                //     qpLineItemId: updatedLineItemId,
                //     targetingType:
                //       TARGETING_TYPES[category.type] ||
                //       'TARGETING_TYPE_CATEGORY',
                //     qpInsertionOrderId: updatedInsertionOrderId,
                //     deviceTargeting: deviceConfig.deviceTargeting
                //   });
                // }
              } catch (error) {
                logger.error(
                  `Error while creating line item for categories: [${platform.value}]-${category.fullName}`,
                  error
                );
              }
            }

            // exclude campaign id for update
            var {
              id: ________,
              advertiser: _________,
              locationList: __________,
              ...fieldsToUpdateCampaign
            } = campaign as any;

            // update campaign as publish success
            campaign = await prismaMain.campaign.update({
              data: {
                ...fieldsToUpdateCampaign,
                entityStatus: ENTITY_STATUS.PUBLISHED
              },
              where: {
                id: campaign.id
              },
              include: {
                advertiser: true,
                locationList: true
              }
            });
          }
        }
      }
      return campaign;
    } catch (error) {
      // exclude campaign id for update
      var {
        id: ________,
        advertiser: _________,
        locationList: __________,
        ...fieldsToUpdateCampaign
      } = campaign as any;

      // update campaign as publish failed
      await prismaMain.campaign.update({
        data: {
          ...fieldsToUpdateCampaign,
          entityStatus: ENTITY_STATUS.PUBLISH_FAILED
        },
        where: {
          id: campaign.id
        }
      });
      throw error;
    }
  }
}
