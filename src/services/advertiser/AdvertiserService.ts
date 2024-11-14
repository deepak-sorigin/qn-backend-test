import { Advertiser } from '../../../generated/client';

export abstract class AdvertiserService {
  abstract create(payload: Advertiser): Promise<Advertiser>;
  abstract fetch(): Promise<Advertiser[]>;
  abstract update(id: string, payload: Advertiser): Promise<Advertiser>;
  abstract fetchById(id: string): Promise<Advertiser>;
  abstract lookup(qpId: number): Promise<Advertiser>;
}
