import { FilterItemForCategoryContentExclusion } from '../../generated/client';

export const CONTENT_THEME_KEYWORD = 'qn-content-theme';

export const LANGUAGE: any = {
  DV360: {
    English: '1000',
    French: '1002'
  },
  TTD: {
    English: '11',
    French: '15'
  },
  XANDR: {
    English: 1,
    French: 5
  }
};

export const DEVICE_TYPES: any = {
  DV360: {
    '1': 'DEVICE_TYPE_COMPUTER',
    '2': 'DEVICE_TYPE_SMART_PHONE',
    '3': 'DEVICE_TYPE_TABLET',
    '4': 'DEVICE_TYPE_CONNECTED_TV'
  },
  TTD: {
    '1': 'PC',
    '2': 'Mobile',
    '3': 'Tablet',
    '4': 'ConnectedTV'
  },
  XANDR: {
    '1': 'pc',
    '2': 'phone',
    '3': 'tablet',
    '4': 'tv'
  }
};

export const AGE_RANGES: any = {
  TTD: {
    from: {
      18: 'Eighteen',
      25: 'TwentyFive',
      35: 'ThirtyFive',
      45: 'FortyFive',
      55: 'FiftyFive',
      65: 'SixtyFive'
    },
    to: {
      24: 'TwentyFour',
      34: 'ThirtyFour',
      44: 'FortyFour',
      54: 'FiftyFour',
      64: 'SixtyFour',
      74: 'SixtyFourPlus'
    }
  }
};

export const TARGETING_TYPES: any = {
  INM: 'TARGETING_TYPE_AUDIENCE_GROUP',
  INT: 'TARGETING_TYPE_AUDIENCE_GROUP'
};

export const TIME_UNITS: any = {
  TIME_UNIT_HOURS: 60,
  TIME_UNIT_DAYS: 1440,
  TIME_UNIT_WEEKS: 10080,
  TIME_UNIT_MONTHS: 43200
};

export const VIEWABILITY: any = {
  10: 'VIEWABILITY_10_PERCENT_OR_MORE',
  20: 'VIEWABILITY_20_PERCENT_OR_MORE',
  30: 'VIEWABILITY_30_PERCENT_OR_MORE',
  40: 'VIEWABILITY_40_PERCENT_OR_MORE',
  50: 'VIEWABILITY_50_PERCENT_OR_MORE',
  60: 'VIEWABILITY_60_PERCENT_OR_MORE',
  70: 'VIEWABILITY_70_PERCENT_OR_MORE',
  80: 'VIEWABILITY_80_PERCENT_OR_MORE',
  90: 'VIEWABILITY_90_PERCENT_OR_MORE',
  100: 'VIEWABILITY_90_PERCENT_OR_MORE'
};

export const GENDER: any = {
  DV360: {
    Female: 'F',
    Male: 'M',
    Both: 'A'
  },
  XANDR: {
    Female: 'f',
    Male: 'm',
    Both: null
  }
};

export const XANDR_GOAL_TYPE: any = {
  CPA: 'cpc',
  CPC: 'cpc',
  CTR: 'ctr',
  VIEWABILITY: 'none'
};

export const DEVICES = {
  VALUES: {
    PC: '1',
    MOB: '2',
    TAB: '3',
    CTV: '4'
  },
  TYPES: {
    '1': 'PC',
    '2': 'MOB',
    '3': 'TAB',
    '4': 'CTV'
  },
  TOTAL: 4,
  ALL: 'OMN',
  PMT: 'PMT'
};

export const locationDataOption: FilterItemForCategoryContentExclusion[] = [
  {
    ttdValue: 'edt6nvh52y',
    label: 'Canada - Alberta',
    dv360Value: '20113'
  },
  {
    ttdValue: 'k2p9nmlgau',
    label: 'Canada - British Columbia',
    dv360Value: '20114'
  },
  {
    ttdValue: '2w27qzvrcs',
    label: 'Canada - Manitoba',
    dv360Value: '20115'
  },
  {
    ttdValue: 'i2kzz2af2a',
    label: 'Canada - New Brunswick',
    dv360Value: '20116'
  },
  {
    ttdValue: 'dztnddz8wd',
    label: 'Canada - Newfoundland and Labrador',
    dv360Value: '20117'
  },
  {
    ttdValue: 'gr2pglpmpr',
    label: 'Canada - Northwest Territories',
    dv360Value: '20119'
  },
  {
    ttdValue: 'qdu3c5qcex',
    label: 'Canada - Nova Scotia',
    dv360Value: '20118'
  },
  {
    ttdValue: 'rrewxqvzvv',
    label: 'Canada - Nunavut',
    dv360Value: '20120'
  },
  {
    ttdValue: 'ijeqwee2ly',
    label: 'Canada - Ontario',
    dv360Value: '20121'
  },
  {
    ttdValue: '7fuj1scogx',
    label: 'Canada - Prince Edward Island',
    dv360Value: '20122'
  },
  {
    ttdValue: '9s2hcjc5vu',
    label: 'Canada - Quebec',
    dv360Value: '20123'
  },
  {
    ttdValue: 'wxc1x8adg3',
    label: 'Canada - Saskatchewan',
    dv360Value: '20124'
  },
  {
    ttdValue: '3ooxtc1rax',
    label: 'Canada - Yukon',
    dv360Value: '20125'
  },
  {
    ttdValue: 'tf1awko7xt',
    label: 'Canada',
    dv360Value: '2124'
  },
  {
    ttdValue: 'd6jfnazdyp',
    label: 'United States - Alabama',
    dv360Value: '21133'
  },
  {
    ttdValue: 'qp95klwqz2',
    label: 'United States - Alaska',
    dv360Value: '21132'
  },
  {
    ttdValue: 'ighbt1sdke',
    label: 'United States - Arizona',
    dv360Value: '21136'
  },
  {
    ttdValue: 'dy1mmqh6je',
    label: 'United States - Arkansas',
    dv360Value: '21135'
  },
  {
    ttdValue: 'gbr8bvk58l',
    label: 'United States - California',
    dv360Value: '21137'
  },
  {
    ttdValue: 'j5kig3nexa',
    label: 'United States - Colorado',
    dv360Value: '21138'
  },
  {
    ttdValue: 'v952qqt798',
    label: 'United States - Connecticut',
    dv360Value: '21139'
  },
  {
    ttdValue: 'hl5nl9vl7w',
    label: 'United States - Delaware',
    dv360Value: '21141'
  },
  {
    ttdValue: 'lq1bswysnp',
    label: 'United States - District of Columbia',
    dv360Value: '21140'
  },
  {
    ttdValue: 'kbq2y9khge',
    label: 'United States - Florida',
    dv360Value: '21142'
  },
  {
    ttdValue: 'oezbmzqud1',
    label: 'United States - Georgia',
    dv360Value: '21143'
  },
  {
    ttdValue: 'tlh9phljuk',
    label: 'United States - Hawaii',
    dv360Value: '21144'
  },
  {
    ttdValue: 'yp7g4d1g5q',
    label: 'United States - Idaho',
    dv360Value: '21146'
  },
  {
    ttdValue: 'ulslpfwmul',
    label: 'United States - Illinois',
    dv360Value: '21147'
  },
  {
    ttdValue: 'okdzwtizqn',
    label: 'United States - Indiana',
    dv360Value: '21148'
  },
  {
    ttdValue: 'bc616ss9tp',
    label: 'United States - Iowa',
    dv360Value: '21145'
  },
  {
    ttdValue: 'xi8a7j5dze',
    label: 'United States - Kansas',
    dv360Value: '21149'
  },
  {
    ttdValue: 'qramzdbcfp',
    label: 'United States - Kentucky',
    dv360Value: '21150'
  },
  {
    ttdValue: 'ue7cw4nr3x',
    label: 'United States - Louisiana',
    dv360Value: '21151'
  },
  {
    ttdValue: 'bsxpfopn5n',
    label: 'United States - Maine',
    dv360Value: '21154'
  },
  {
    ttdValue: 'jre6lpsmvh',
    label: 'United States - Maryland',
    dv360Value: '21153'
  },
  {
    ttdValue: 'f1yorutnjr',
    label: 'United States - Massachusetts',
    dv360Value: '21152'
  },
  {
    ttdValue: '8aobvbtnkn',
    label: 'United States - Michigan',
    dv360Value: '21155'
  },
  {
    ttdValue: '4men8l2g27',
    label: 'United States - Minnesota',
    dv360Value: '21156'
  },
  {
    ttdValue: 'ni6fpp45yz',
    label: 'United States - Mississippi',
    dv360Value: '21158'
  },
  {
    ttdValue: '8t6bjy8mmu',
    label: 'United States - Missouri',
    dv360Value: '21157'
  },
  {
    ttdValue: '5ozsldlzbc',
    label: 'United States - Montana',
    dv360Value: '21159'
  },
  {
    ttdValue: 'jwegdvxjc2',
    label: 'United States - Nebraska',
    dv360Value: '21162'
  },
  {
    ttdValue: 'r11clrp3kk',
    label: 'United States - Nevada',
    dv360Value: '21166'
  },
  {
    ttdValue: 'zo83lbz13p',
    label: 'United States - New Hampshire',
    dv360Value: '21163'
  },
  {
    ttdValue: 'df8wrnq2sy',
    label: 'United States - New Jersey',
    dv360Value: '21164'
  },
  {
    ttdValue: 'shb636zeoh',
    label: 'United States - New Mexico',
    dv360Value: '21165'
  },
  {
    ttdValue: '8sy3osydel',
    label: 'United States - New York',
    dv360Value: '21167'
  },
  {
    ttdValue: 'opfhiq1f71',
    label: 'United States - North Carolina',
    dv360Value: '21160'
  },
  {
    ttdValue: 'ojqo2ave32',
    label: 'United States - North Dakota',
    dv360Value: '21161'
  },
  {
    ttdValue: 'rp6quo572h',
    label: 'United States - Ohio',
    dv360Value: '21168'
  },
  {
    ttdValue: 'v6aeks1a2h',
    label: 'United States - Oklahoma',
    dv360Value: '21169'
  },
  {
    ttdValue: 'xqbu512vcd',
    label: 'United States - Oregon',
    dv360Value: '21170'
  },
  {
    ttdValue: 'jtpwp6b329',
    label: 'United States - Pennsylvania',
    dv360Value: '21171'
  },
  {
    ttdValue: 'qqplxzbhh1',
    label: 'United States - Rhode Island',
    dv360Value: '21172'
  },
  {
    ttdValue: '99xxg6mhau',
    label: 'United States - South Carolina',
    dv360Value: '21173'
  },
  {
    ttdValue: 'rfdl4r92jk',
    label: 'United States - South Dakota',
    dv360Value: '21174'
  },
  {
    ttdValue: 'b6ldpdfsb9',
    label: 'United States - Tennessee',
    dv360Value: '21175'
  },
  {
    ttdValue: 'pvov8a4m9i',
    label: 'United States - Texas',
    dv360Value: '21176'
  },
  {
    ttdValue: '7qhyr5lb6l',
    label: 'United States - Utah',
    dv360Value: '21177'
  },
  {
    ttdValue: 'ev97v5ntzk',
    label: 'United States - Vermont',
    dv360Value: '21179'
  },
  {
    ttdValue: 'hrkfdkujgb',
    label: 'United States - Virginia',
    dv360Value: '21178'
  },
  {
    ttdValue: 'wkpjoc6iyb',
    label: 'United States - Washington',
    dv360Value: '21180'
  },
  {
    ttdValue: 'm7bfnyb9pp',
    label: 'United States - West Virginia',
    dv360Value: '21183'
  },
  {
    ttdValue: 'sm86dwu4pa',
    label: 'United States - Wisconsin',
    dv360Value: '21182'
  },
  {
    ttdValue: '3573dmy1h8',
    label: 'United States - Wyoming',
    dv360Value: '21184'
  },
  {
    ttdValue: 'bpywp4wtwk',
    label: 'United States',
    dv360Value: '2840'
  }
];

export const GEO_TARGET_LEVEL = {
  COUNTRY: '1. Country',
  REGION: '2. Region (Province/State)',
  CITY: '3. Domain (City)'
};

export const NonCategoryTypes = ['Affinity', 'INT', 'INM', 'Interest'];
