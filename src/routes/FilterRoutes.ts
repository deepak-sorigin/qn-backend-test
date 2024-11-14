import { Router } from 'express';
import { configs } from '../config';
import { FilterController } from '../controllers/FilterController';
import { FilterService } from '../services/filter/FilterService';
import { FilterServiceImpl } from '../services/filter/FilterServiceImpl';
import { validate } from '../validations';
import { filterValidations } from '../validations/filter.validation';

export class FilterRoutes {
  private router: Router;
  private endpoint = '/filter';

  private filterController: FilterController;

  constructor(router: Router) {
    this.router = router;

    const filterService: FilterService = new FilterServiceImpl(
      configs.QN_QP_BASE_URL,
      configs.QN_QP_API_TOKEN
    );
    this.filterController = new FilterController(filterService);
  }

  configureRoutes() {
    // fetch category filters
    this.router.get(
      `${this.endpoint}/category`,
      validate(filterValidations.category),
      (req, res) => this.filterController.category(req, res)
    );

    // fetch keyword filters
    this.router.get(
      `${this.endpoint}/keyword`,
      validate(filterValidations.keyword),
      (req, res) => this.filterController.keyword(req, res)
    );

    // fetch retool360 target list
    this.router.get(
      `${this.endpoint}/360-target`,
      validate(filterValidations.retool360TargetList),
      (req, res) => this.filterController.retool360TargetList(req, res)
    );

    // fetch keywords filters for sales
    this.router.post(
      `${this.endpoint}/keyword/sales`,
      validate(filterValidations.keywordsForSales),
      (req, res) => this.filterController.keywordsForSales(req, res)
    );

    // fetch retool360 target list for sales
    this.router.post(
      `${this.endpoint}/360-target/sales`,
      validate(filterValidations.retool360TargetListForSales),
      (req, res) => this.filterController.retool360TargetListForSales(req, res)
    );

    // fetch advertiser filters
    this.router.get(
      `${this.endpoint}/advertiser`,
      validate(filterValidations.advertiser),
      (req, res) => this.filterController.advertiser(req, res)
    );
  }
}
