import { Campaign } from '../../../generated/client';

export abstract class CampaignService {
  abstract create(payload: Campaign): Promise<Campaign>;
  abstract fetch(): Promise<Campaign[]>;
  abstract update(id: string, payload: Campaign): Promise<Campaign>;
  abstract fetchById(id: string): Promise<Campaign>;
  abstract publish(id: string): Promise<Campaign>;
}
