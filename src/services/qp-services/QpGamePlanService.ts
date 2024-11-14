import { Advertiser, Campaign, ENTITY_STATUS } from '../../../generated/client';
import { QpApiAction } from '../../constants/qp-api-service.constant';
import { ApiUtils } from '../../utils/api';

export class QpGamePlanService {
  private baseUrl: string;
  private apiToken: string;

  constructor(baseUrl: string, apiToken: string) {
    this.baseUrl = baseUrl;
    this.apiToken = apiToken;
  }

  // map campaign
  private mapCampaign(action: QpApiAction, campaign: Campaign) {
    const advertiser: Advertiser = (campaign as any).advertiser;

    return {
      ...(action === QpApiAction.CREATE
        ? { advertiser_id: advertiser.qpId }
        : {}),
      ...(action === QpApiAction.CREATE ? { campaign_id: campaign.qpId } : {}),
      display_name:
        advertiser.displayName + campaign.displayName + ' Game plan',
      entity_status: 'ACTIVE'
    };
  }

  // create gamePlan
  private async create(campaign: Campaign) {
    const payload = this.mapCampaign(QpApiAction.CREATE, campaign);

    return await ApiUtils.callApi({
      method: 'POST',
      url: `${this.baseUrl}/game-plan`,
      headers: {
        API_TOKEN: this.apiToken
      },
      data: payload
    });
  }

  // update gamePlan
  private async update(qpId: number, campaign: Campaign) {
    const payload = this.mapCampaign(QpApiAction.UPDATE, campaign);

    return await ApiUtils.callApi({
      method: 'PUT',
      url: `${this.baseUrl}/game-plan/${qpId}`,
      headers: {
        API_TOKEN: this.apiToken
      },
      data: payload
    });
  }

  // publish gamePlan
  async publish(campaign: Campaign): Promise<Campaign> {
    // check if campaign has qpGamePlanId
    if (campaign.qpGamePlanId) {
      await this.update(campaign.qpGamePlanId, campaign);
    } else {
      const response = await this.create(campaign);

      // update gamePlan qpGamePlanId
      campaign.qpGamePlanId = response.data.data.id;
    }

    // update entity status
    campaign.entityStatus = ENTITY_STATUS.PUBLISH_REQUESTED;

    return campaign;
  }
}
