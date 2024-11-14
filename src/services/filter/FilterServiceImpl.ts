import { logger } from '@azure/identity';
import {
  ContentThemes,
  DemographicInformation,
  FilterItem,
  RetoolTarget
} from '../../../generated/client';
import {
  Prisma,
  PrismaClient as PrismaRetoolClient
} from '../../../generated/retool';
import { prismaMain, prismaRetool } from '../../database/prisma';
import { PaginatedList } from '../../models/common/PaginatedList';
import { CategoryFilterResponse } from '../../models/filter/CategoryFilterResponse';
import { ApiUtils } from '../../utils/api';
import { OpenAiUtils } from '../../utils/open-ai';
import { FilterService } from './FilterService';

export class FilterServiceImpl extends FilterService {
  constructor(
    private baseUrl: string,
    private apiToken: string
  ) {
    super();
  }

  // fetch category filters
  async category(filters: {
    pageNumber: number;
    limit: number;
    platform: string[];
    type: string[];
    search?: string;
  }): Promise<PaginatedList<CategoryFilterResponse>> {
    // create where clauses
    const whereClauses: Prisma.CategoryWhereInput = {
      full_name: {
        contains: filters.search,
        mode: 'insensitive'
      },
      ...(filters.platform.length
        ? {
            platform: {
              in: filters.platform
            }
          }
        : {}),
      ...(filters.type.length
        ? {
            type: {
              in: filters.type
            }
          }
        : {})
    };

    // fetch category list
    const categoryList = await prismaRetool.category.findMany({
      take: filters.limit,
      skip: (filters.pageNumber - 1) * filters.limit,
      where: whereClauses,
      select: {
        id: true,
        full_name: true,
        platform_id: true
      }
    });

    // map category list
    const list = categoryList.map((category) => {
      return {
        id: category.id,
        value: category.full_name,
        platformId: category.platform_id
      };
    });

    // fetch total count
    const total = await prismaRetool.category.count({
      where: whereClauses
    });

    return {
      list,
      total
    };
  }

  // fetch keyword filters
  async keyword(filters: {
    campaignId: string;
    count: number;
  }): Promise<ContentThemes> {
    // fetch campaign
    const campaign = await prismaMain.campaign.findFirst({
      where: {
        id: filters.campaignId
      },
      include: {
        advertiser: true
      }
    });

    if (!campaign) {
      throw new Error('Campaign not found.');
    }

    // create open ai utils instance
    const openAiUtils = new OpenAiUtils();

    // fetch keywords for advertiser
    let response = await openAiUtils.chatCompletion(
      `Generate a list of the top ${filters.count} unique suggested keywords for SEM related to ${campaign?.advertiser.advertiserUrl}, while excluding any brand-specific terms. Ensure that the keywords are distinct and suitable for use in JavaScript code`
    );

    // transform response
    const keywordsFromAdvertiser = openAiUtils.transformKeywordResponse(
      response.data
    );

    // fetch keywords for competitor
    let keywordsFromCompetitor: string[] = [];
    if (campaign?.advertiser.competitorUrl?.length) {
      response = await openAiUtils.chatCompletion(
        `Generate a list of the top ${filters.count} unique suggested keywords for SEM related to ${campaign?.advertiser.competitorUrl.join(', ')}, while excluding any brand-specific terms. Ensure that the keywords are distinct and suitable for use in JavaScript code`
      );

      // transform response
      keywordsFromCompetitor = openAiUtils.transformKeywordResponse(
        response.data
      );
    }

    // fetch keywords for category
    response = await openAiUtils.chatCompletion(
      `Generate a list of the top ${filters.count} unique suggested keywords for SEM for ${campaign?.demographicInformation.category.label}, while excluding any brand-specific terms. Ensure that the keywords are distinct and suitable for use in JavaScript code`
    );

    // transform response
    const keywordsFromCategory = openAiUtils.transformKeywordResponse(
      response.data
    );

    // fetch keywords for culture vector
    response = await openAiUtils.chatCompletion(
      `Generate a list of the top ${filters.count} unique suggested keywords for SEM for ${campaign?.demographicInformation.cultureVector.map((item) => item.label).join(', ')}, while excluding any brand-specific terms. Ensure that the keywords are distinct and suitable for use in JavaScript code`
    );

    // transform response
    const keywordsFromCultureVector = openAiUtils.transformKeywordResponse(
      response.data
    );

    // prepare keywords
    const keywords: ContentThemes = {
      keywordsFromAdvertiser: [...new Set(keywordsFromAdvertiser)],
      keywordsFromCompetitor: [...new Set(keywordsFromCompetitor)],
      keywordsFromCategory: [...new Set(keywordsFromCategory)],
      keywordsFromCultureVector: [...new Set(keywordsFromCultureVector)]
    };

    // save keywords to db
    await this.saveAllKeywordsToDB([
      ...keywordsFromAdvertiser,
      ...keywordsFromCompetitor,
      ...keywordsFromCategory,
      ...keywordsFromCultureVector
    ]);

    return keywords;
  }

  // find missing keywords in the database
  async findMissingKeywords(keywordList: string[]) {
    const client = new PrismaRetoolClient();
    try {
      const tempTableName = `temp_phrase_table_${new Date().getTime()}`;
      // Create a temporary table
      await client.$executeRawUnsafe(`
        CREATE TEMP TABLE ${tempTableName} (
          phrase VARCHAR
        )
      `);

      // Insert phrases into the temporary table
      for (const phrase of keywordList) {
        await client.$executeRawUnsafe(
          `
          INSERT INTO ${tempTableName} (phrase) VALUES ($1)
          `,
          phrase
        );
      }

      // Perform a LEFT JOIN to find missing phrases
      const result: any = await client.$queryRawUnsafe(`
        SELECT ARRAY_AGG(${tempTableName}.phrase) as result
        FROM ${tempTableName}
        LEFT JOIN keywords ON ${tempTableName}.phrase = keywords.phrase
        WHERE keywords.phrase IS NULL
      `);

      // Drop the temporary table
      await client.$executeRawUnsafe(`
        DROP TABLE ${tempTableName}
      `);

      return result[0].result;
    } catch (error) {
      client.$disconnect();
      throw error;
    }
  }

  // save all keywords to the database
  async saveAllKeywordsToDB(keywordList: string[]) {
    try {
      // remove duplicates from keyword list
      keywordList = [...new Set(keywordList)];

      // filter keyword list which are not exists in retool keywords table
      const result = await this.findMissingKeywords(keywordList);

      // save embedding for each keyword
      const openAiUtils = new OpenAiUtils();
      for (const keyword of result) {
        const response = await openAiUtils.embeddings([keyword]);

        // save keyword to db
        try {
          await prismaRetool.$executeRaw(Prisma.sql`
            INSERT INTO keywords (phrase, embedding, embedding_model) VALUES (${keyword}, ${response.data.data[0].embedding}, 'text-embedding-ada-002');
            `);
          logger.info(`Embedding for keyword saved to DB: ${keyword}`);
        } catch (error: any) {
          logger.error('saveAllKeywordsToDB-insertion-error', error?.message);
        }
      }
    } catch (error) {
      logger.error('saveAllKeywordsToDB-error', error);
    }
  }

  // fetch retool 360 target list
  async retool360TargetList(filters: {
    campaignId: string;
    platform: string[];
  }): Promise<RetoolTarget[]> {
    // fetch campaign
    const campaign = await prismaMain.campaign.findFirst({
      where: {
        id: filters.campaignId
      }
    });

    if (!campaign) {
      throw new Error('Campaign not found.');
    }

    // merge all keywords
    const keywords = [
      ...(campaign.contentThemes?.keywordsFromAdvertiser || []),
      ...(campaign.contentThemes?.keywordsFromCompetitor || []),
      ...(campaign.contentThemes?.keywordsFromCategory || []),
      ...(campaign.contentThemes?.keywordsFromCultureVector || [])
    ];

    if (!keywords.length) {
      throw new Error('No keywords found in campaign.');
    }

    // // fetch retool 360 target list
    // return prismaRetool.$queryRawUnsafe(
    //   `
    //   WITH
    //     input_phrases AS (
    //       select
    //         embedding
    //       from
    //         keywords
    //       where
    //         phrase in (
    //           ${keywords.map((item) => `'${item.replace(/'/g, "''")}'`).join(',\n')}
    //         )
    //     ),
    //     ranked_results AS (
    //       select
    //         c.platform,
    //         c.type,
    //         c.full_name,
    //         c.line_item_name_variable,
    //         c.leaf,
    //         c.platform_id,
    //         sum((c.embedding <=> p.embedding)) as relevance,
    //         ROW_NUMBER() OVER (
    //           PARTITION BY
    //             c.platform,
    //             c.type
    //           ORDER BY
    //             SUM((c.embedding <=> p.embedding)) ASC
    //         ) AS row_num
    //       FROM
    //         categories c
    //         CROSS JOIN input_phrases p
    //       GROUP BY
    //         c.platform,
    //         c.type,
    //         c.full_name,
    //         c.line_item_name_variable,
    //         c.leaf,
    //         c.platform_id
    //     )
    //   SELECT
    //     platform,
    //     "type",
    //     full_name as "fullName",
    //     line_item_name_variable as "lineItemNameVariable",
    //     leaf,
    //     platform_id as "platformId",
    //     CAST(relevance as double precision) as "relevance",
    //     row_num::int as "rowNumber"
    //   FROM
    //     ranked_results
    //   WHERE
    //     ${filters.platform.length ? `platform in (${filters.platform.map((item) => `'${item}'`).join(',')})` : `TRUE`}
    //     -- AND row_num <=50
    //   ORDER BY
    //     platform,
    //     "type",
    //     row_num;
    //   `
    // );

    // fetch retool 360 target list
    return prismaRetool.$queryRawUnsafe(
      `
        WITH
          input_phrases AS (
            SELECT
              embedding
            FROM
              keywords
            WHERE
              phrase IN (
                ${keywords.map((item) => `'${item.replace(/'/g, "''")}'`).join(',\n')}
              )
          ),
          ranked_results AS (
            SELECT
              c.platform,
              c.type,
              c.full_name,
              c.line_item_name_variable,
              c.leaf,
              c.platform_id,
              SUM((c.embedding <=> p.embedding)) AS relevance,
              ROW_NUMBER() OVER (
                PARTITION BY
                  c.platform,
                  c.type
                ORDER BY
                  SUM((c.embedding <=> p.embedding)) ASC
              ) AS row_num
            FROM
              categories c
              CROSS JOIN input_phrases p
            GROUP BY
              c.platform,
              c.type,
              c.full_name,
              c.line_item_name_variable,
              c.leaf,
              c.platform_id
          ),
          targeting_result AS (
            SELECT
              platform,
              "type",
              full_name AS "fullName",
              line_item_name_variable AS "lineItemNameVariable",
              leaf,
              platform_id AS "platformId",
              CAST(relevance AS double precision) AS "relevance",
              row_num::int AS "rowNumber"
            FROM
              ranked_results
            -- WHERE
            --  row_num <= 50
          ),
          t3pd_result AS (
            SELECT
              'DV360' AS platform,
              '3PD' AS "type",
              t3."3pd" AS "fullName",
              'NA' AS "lineItemNameVariable",
              'NA' AS leaf,
              t3.id::text AS "platformId",
              CAST(0 AS double precision) AS "relevance",
              (ROW_NUMBER() OVER ())::int AS "rowNumber"
            FROM
              "3pd" AS t3
            WHERE
              UPPER(t3."3pd") SIMILAR TO UPPER(E'%((${keywords.join(')|(').replace(/'/g, "''")}))%')
            LIMIT
              50
          ),
          final_result AS (
            SELECT
              *
            FROM
              targeting_result
            UNION
            SELECT
              *
            FROM
              t3pd_result
          )
        SELECT
          *
        FROM
          final_result
        ORDER BY
          platform,
          "type",
          "rowNumber"
      `
    );
  }

  // fetch keyword filters for sales
  async keywordsForSales(filters: {
    advertiserUrl: string;
    competitorUrl: string[];
    demographicInformation: DemographicInformation;
    count: number;
  }): Promise<ContentThemes> {
    // create open ai utils instance
    const openAiUtils = new OpenAiUtils();

    // fetch keywords for advertiser
    let response = await openAiUtils.chatCompletion(
      `Generate a list of the top ${filters.count} unique suggested keywords for SEM related to ${filters.advertiserUrl}, while excluding any brand-specific terms. Ensure that the keywords are distinct and suitable for use in JavaScript code`
    );

    // transform response
    const keywordsFromAdvertiser = openAiUtils.transformKeywordResponse(
      response.data
    );

    // fetch keywords for competitor
    let keywordsFromCompetitor: string[] = [];
    if (filters.competitorUrl?.length) {
      response = await openAiUtils.chatCompletion(
        `Generate a list of the top ${filters.count} unique suggested keywords for SEM related to ${filters.competitorUrl.join(', ')}, while excluding any brand-specific terms. Ensure that the keywords are distinct and suitable for use in JavaScript code`
      );

      // transform response
      keywordsFromCompetitor = openAiUtils.transformKeywordResponse(
        response.data
      );
    }

    // fetch keywords for category
    response = await openAiUtils.chatCompletion(
      `Generate a list of the top ${filters.count} unique suggested keywords for SEM for ${filters.demographicInformation.category.label}, while excluding any brand-specific terms. Ensure that the keywords are distinct and suitable for use in JavaScript code`
    );

    // transform response
    const keywordsFromCategory = openAiUtils.transformKeywordResponse(
      response.data
    );

    // fetch keywords for culture vector
    response = await openAiUtils.chatCompletion(
      `Generate a list of the top ${filters.count} unique suggested keywords for SEM for ${filters.demographicInformation.cultureVector.map((item: any) => item.label).join(', ')}, while excluding any brand-specific terms. Ensure that the keywords are distinct and suitable for use in JavaScript code`
    );

    // transform response
    const keywordsFromCultureVector = openAiUtils.transformKeywordResponse(
      response.data
    );

    // prepare keywords
    const keywords: ContentThemes = {
      keywordsFromAdvertiser: [...new Set(keywordsFromAdvertiser)],
      keywordsFromCompetitor: [...new Set(keywordsFromCompetitor)],
      keywordsFromCategory: [...new Set(keywordsFromCategory)],
      keywordsFromCultureVector: [...new Set(keywordsFromCultureVector)]
    };

    // save keywords to db
    await this.saveAllKeywordsToDB([
      ...keywordsFromAdvertiser,
      ...keywordsFromCompetitor,
      ...keywordsFromCategory,
      ...keywordsFromCultureVector
    ]);

    return keywords;
  }

  // fetch retool 360 target list for sales
  async retool360TargetListForSales(filters: {
    contentThemes: ContentThemes;
    platform: string[];
  }): Promise<RetoolTarget[]> {
    // merge all keywords
    const keywords = [
      ...(filters.contentThemes?.keywordsFromAdvertiser || []),
      ...(filters.contentThemes?.keywordsFromCompetitor || []),
      ...(filters.contentThemes?.keywordsFromCategory || []),
      ...(filters.contentThemes?.keywordsFromCultureVector || [])
    ];

    if (!keywords.length) {
      throw new Error('No keywords found.');
    }

    // // fetch retool 360 target list
    // return prismaRetool.$queryRawUnsafe(
    //   `
    //   WITH
    //     input_phrases AS (
    //       select
    //         embedding
    //       from
    //         keywords
    //       where
    //         phrase in (
    //           ${keywords.map((item) => `'${item.replace(/'/g, "''")}'`).join(',\n')}
    //         )
    //     ),
    //     ranked_results AS (
    //       select
    //         c.platform,
    //         c.type,
    //         c.full_name,
    //         c.line_item_name_variable,
    //         c.leaf,
    //         c.platform_id,
    //         sum((c.embedding <=> p.embedding)) as relevance,
    //         ROW_NUMBER() OVER (
    //           PARTITION BY
    //             c.platform,
    //             c.type
    //           ORDER BY
    //             SUM((c.embedding <=> p.embedding)) ASC
    //         ) AS row_num
    //       FROM
    //         categories c
    //         CROSS JOIN input_phrases p
    //       GROUP BY
    //         c.platform,
    //         c.type,
    //         c.full_name,
    //         c.line_item_name_variable,
    //         c.leaf,
    //         c.platform_id
    //     )
    //   SELECT
    //     platform,
    //     "type",
    //     full_name as "fullName",
    //     line_item_name_variable as "lineItemNameVariable",
    //     leaf,
    //     platform_id as "platformId",
    //     CAST(relevance as double precision) as "relevance",
    //     row_num::int as "rowNumber"
    //   FROM
    //     ranked_results
    //   WHERE
    //     ${filters.platform.length ? `platform in (${filters.platform.map((item) => `'${item}'`).join(',')})` : `TRUE`}
    //     -- AND row_num <=50
    //   ORDER BY
    //     platform,
    //     "type",
    //     row_num;
    //   `
    // );

    // fetch retool 360 target list
    return prismaRetool.$queryRawUnsafe(
      `
        WITH
          input_phrases AS (
            SELECT
              embedding
            FROM
              keywords
            WHERE
              phrase IN (
                ${keywords.map((item) => `'${item.replace(/'/g, "''")}'`).join(',\n')}
              )
          ),
          ranked_results AS (
            SELECT
              c.platform,
              c.type,
              c.full_name,
              c.line_item_name_variable,
              c.leaf,
              c.platform_id,
              SUM((c.embedding <=> p.embedding)) AS relevance,
              ROW_NUMBER() OVER (
                PARTITION BY
                  c.platform,
                  c.type
                ORDER BY
                  SUM((c.embedding <=> p.embedding)) ASC
              ) AS row_num
            FROM
              categories c
              CROSS JOIN input_phrases p
            GROUP BY
              c.platform,
              c.type,
              c.full_name,
              c.line_item_name_variable,
              c.leaf,
              c.platform_id
          ),
          targeting_result AS (
            SELECT
              platform,
              "type",
              full_name AS "fullName",
              line_item_name_variable AS "lineItemNameVariable",
              leaf,
              platform_id AS "platformId",
              CAST(relevance AS double precision) AS "relevance",
              row_num::int AS "rowNumber"
            FROM
              ranked_results
            -- WHERE
            --  row_num <= 50
          ),
          t3pd_result AS (
            SELECT
              'DV360' AS platform,
              '3PD' AS "type",
              t3."3pd" AS "fullName",
              'NA' AS "lineItemNameVariable",
              'NA' AS leaf,
              t3.id::text AS "platformId",
              CAST(0 AS double precision) AS "relevance",
              (ROW_NUMBER() OVER ())::int AS "rowNumber"
            FROM
              "3pd" AS t3
            WHERE
              UPPER(t3."3pd") SIMILAR TO UPPER(E'%((${keywords.join(')|(').replace(/'/g, "''")}))%')
            LIMIT
              50
          ),
          final_result AS (
            SELECT
              *
            FROM
              targeting_result
            UNION
            SELECT
              *
            FROM
              t3pd_result
          )
        SELECT
          *
        FROM
          final_result
        ORDER BY
          platform,
          "type",
          "rowNumber"
      `
    );
  }

  // fetch advertiser filters
  async advertiser(filters: {
    pageNumber: number;
    limit: number;
    search?: string;
  }): Promise<PaginatedList<FilterItem>> {
    // fetch advertiser list from qp
    const response = await ApiUtils.callApi({
      method: 'GET',
      url: `${this.baseUrl}/advertisers/filter/displayname`,
      headers: {
        API_TOKEN: this.apiToken
      },
      params: {
        pageNumber: filters.pageNumber,
        pageSize: filters.limit,
        ...(filters.search ? { value: filters.search } : {})
      }
    });

    const { advertisers, totalCount } = response.data.data;

    // map category list
    const list: FilterItem[] = advertisers.map((advertiser: any) => {
      return {
        label: advertiser.display_name,
        value: advertiser.id
      };
    });

    return {
      list,
      total: totalCount
    };
  }
}
