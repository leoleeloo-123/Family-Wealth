
export interface Member {
  成员ID: string;
  成员昵称: string;
}

export interface Institution {
  机构ID: string;
  机构名称: string;
  机构类型: string;
  国家地区: string;
  币种: string;
  代表色HEX: string;
}

export interface Device {
  设备ID: string;
  设备昵称: string;
  成员昵称: string;
  运营商: string;
  设备类型: string;
  国家地区: string;
  地区号: string;
  手机号: string;
}

export interface Account {
  账户ID: string;
  账户昵称: string;
  成员ID: string;
  成员昵称: string;
  机构ID: string;
  机构名称: string;
  币种: string;
  账户类型: string;
  资产类型: string;
  风险评估: string;
  收益等级: string;
  账号: string;
  密码: string;
  设备ID: string;
  设备昵称: string;
  账户细节: string;
  登录备注: string;
}

export interface Insurance {
  保险ID: string;
  保险昵称: string;
  账户ID: string;
  账户昵称: string;
  保险类型: string;
  保单号: string;
  被保险人ID: string;
  被保险人: string;
  受益人ID: string;
  受益人: string;
  保额: number;
  备注: string;
}

export interface ExchangeRate {
  汇率ID: string;
  时间: string;
  基准币种: string;
  报价币种: string;
  汇率: number;
  来源: string;
}

export interface FixedAsset {
  资产ID: string;
  资产昵称: string;
  成员ID: string;
  成员昵称: string;
  固定资产类型: string;
  购入时间: string;
  购入价格: number;
  币种: string;
  股份: number;
  备注: string;
}

export interface LiquidAssetRecord {
  账户ID: string;
  账户昵称: string;
  时间: string;
  币种: string;
  市值: number;
  市值备注: string;
}

export interface FixedAssetRecord {
  资产ID: string;
  资产昵称: string;
  时间: string;
  币种: string;
  估值: number;
  估值备注: string;
}

export interface LoanRecord {
  成员ID: string;
  成员昵称: string;
  借入借出: '借入' | '借出';
  资产类型: string;
  时间: string;
  币种: string;
  借款额: number;
  借款对象: string;
  结清: '是' | '否';
  借款备注: string;
}

export interface DividendRecord {
  资产ID: string;
  资产昵称: string;
  时间: string;
  公司总分红: number;
  币种: string;
  股份: number;
  分红金额: number;
  分红备注: string;
}

export interface AppData {
  成员: Member[];
  机构: Institution[];
  手机: Device[];
  账户: Account[];
  保险: Insurance[];
  汇率: ExchangeRate[];
  固定资产: FixedAsset[];
  流动资产记录: LiquidAssetRecord[];
  固定资产记录: FixedAssetRecord[];
  借入借出记录: LoanRecord[];
  企业分红记录: DividendRecord[];
}

export type TabName = keyof AppData;

export interface AppSettings {
  theme: 'light' | 'dark';
  baseCurrency: string;
  fontSize: 'small' | 'medium' | 'large';
  dateFormat: string;
  language: 'en' | 'zh';
}
