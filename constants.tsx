
import { TabName } from './types';

export const EXCEL_STRUCTURE: Record<TabName, string[]> = {
  成员: ['成员ID', '成员昵称'],
  机构: ['机构ID', '机构名称', '机构类型', '国家地区', '币种', '代表色HEX'],
  手机: ['设备ID', '设备昵称', '成员昵称', '运营商', '设备类型', '国家地区', '地区号', '手机号'],
  账户: ['账户ID', '账户昵称', '成员ID', '成员昵称', '机构ID', '机构名称', '账户类型', '资产类型', '风险评估', '收益等级', '账号', '密码', '设备ID', '设备昵称', '账户细节', '登录备注'],
  保险: ['保险ID', '保险昵称', '账户ID', '账户昵称', '保险类型', '保单号', '被保险人ID', '被保险人', '受益人ID', '受益人', '保额', '备注'],
  汇率: ['汇率ID', '时间', '基准币种', '报价币种', '汇率', '来源'],
  固定资产: ['资产ID', '资产昵称', '成员ID', '成员昵称', '固定资产类型', '购入时间', '购入价格', '币种', '股份', '备注'],
  流动资产记录: ['账户ID', '账户昵称', '时间', '币种', '市值', '市值备注'],
  固定资产记录: ['资产ID', '资产昵称', '时间', '币种', '估值', '估值备注'],
  借入借出记录: ['成员ID', '成员昵称', '借入借出', '资产类型', '时间', '币种', '借款额', '借款对象', '结清', '借款备注'],
  企业分红记录: ['资产ID', '资产昵称', '账户ID', '账户昵称', '时间', '公司总分红', '币种', '股份', '分红金额', '分红备注'],
};

export const INITIAL_APP_DATA: any = {
  成员: [
    { 成员ID: 'M001', 成员昵称: 'Alpha (Head)' },
    { 成员ID: 'M002', 成员昵称: 'Beta (Partner)' },
    { 成员ID: 'M003', 成员昵称: 'Junior' }
  ],
  机构: [
    { 机构ID: 'INST001', 机构名称: 'Global Bank Corp', 机构类型: 'Banking', 国家地区: 'USA', 币种: 'USD', 代表色HEX: '#1e40af' },
    { 机构ID: 'INST002', 机构名称: 'Oriental Trust', 机构类型: 'Investment', 国家地区: 'China', 币种: 'CNY', 代表色HEX: '#b91c1c' },
    { 机构ID: 'INST003', 机构名称: 'Vanguard Group', 机构类型: 'Brokerage', 国家地区: 'USA', 币种: 'USD', 代表色HEX: '#4338ca' }
  ],
  手机: [
    { 设备ID: 'DEV001', 设备昵称: 'Main iPhone', 成员昵称: 'Alpha (Head)', 运营商: 'Verizon', 设备类型: 'Mobile', 国家地区: 'USA', 地区号: '1', 手机号: '5550101' }
  ],
  账户: [
    { 账户ID: 'ACC001', 账户昵称: 'Main Checking', 成员ID: 'M001', 成员昵称: 'Alpha (Head)', 机构ID: 'INST001', 机构名称: 'Global Bank Corp', 账户类型: 'Checking', 资产类型: 'Cash', 风险评估: 'Low', 收益等级: 'None', 账号: '****1234', 密码: 'demo123', 设备ID: 'DEV001', 设备昵称: 'Main iPhone', 账户细节: 'Primary spending account', 登录备注: '2FA enabled' },
    { 账户ID: 'ACC002', 账户昵称: 'Retirement 401k', 成员ID: 'M002', 成员昵称: 'Beta (Partner)', 机构ID: 'INST003', 机构名称: 'Vanguard Group', 账户类型: 'Investment', 资产类型: 'Stock', 风险评估: 'Medium', 收益等级: 'Growth', 账号: '****5678', 密码: 'pass999', 设备ID: '', 设备昵称: '', 账户细节: 'Long-term equity focus', 登录备注: '' }
  ],
  保险: [
    { 保险ID: 'INS001', 保险昵称: 'Family Life Shield', 账户ID: 'ACC001', 账户昵称: 'Main Checking', 保险类型: 'Life', 保单号: 'LP-882299', 被保险人ID: 'M001', 被保险人: 'Alpha (Head)', 受益人ID: 'M002', 受益人: 'Beta (Partner)', 保额: 500000, 备注: 'Annual renewal in Oct' }
  ],
  汇率: [
    { 汇率ID: 'FX001', 时间: '2024-01-01', 基准币种: 'CNY', 报价币种: 'USD', 汇率: 7.21, 来源: 'Central Bank' },
    { 汇率ID: 'FX002', 时间: '2024-01-01', 基准币种: 'HKD', 报价币种: 'USD', 汇率: 7.82, 来源: 'HKMA' }
  ],
  固定资产: [
    { 资产ID: 'FIX001', 资产昵称: 'Silicon Valley Condo', 成员ID: 'M001', 成员昵称: 'Alpha (Head)', 固定资产类型: 'Real Estate', 购入时间: '2020-05-15', 购入价格: 850000, 币种: 'USD', 股份: 1, 备注: 'Primary residence' },
    { 资产ID: 'FIX002', 资产昵称: 'Tesla Model 3', 成员ID: 'M002', 成员昵称: 'Beta (Partner)', 固定资产类型: 'Vehicle', 购入时间: '2022-11-20', 购入价格: 45000, 币种: 'USD', 股份: 1, 备注: 'Fully paid' }
  ],
  流动资产记录: [
    { 账户ID: 'ACC001', 账户昵称: 'Main Checking', 时间: '2024-03-01', 币种: 'USD', 市值: 12500, 市值备注: 'End of month balance' },
    { 账户ID: 'ACC002', 账户昵称: 'Retirement 401k', 时间: '2024-03-01', 币种: 'USD', 市值: 185000, 市值备注: 'Market recovery gain' }
  ],
  固定资产记录: [
    { 资产ID: 'FIX001', 资产昵称: 'Silicon Valley Condo', 时间: '2024-03-01', 币种: 'USD', 估值: 920000, 估值备注: 'Recent area comps' },
    { 资产ID: 'FIX002', 资产昵称: 'Tesla Model 3', 时间: '2024-03-01', 币种: 'USD', 估值: 32000, 估值备注: 'KBB valuation' }
  ],
  借入借出记录: [
    { 成员ID: 'M001', 成员昵称: 'Alpha (Head)', 借入借出: '借出', 资产类型: 'Cash', 时间: '2024-02-10', 币种: 'USD', 借款额: 5000, 借款对象: 'Brother John', 结清: '否', 借款备注: 'Downpayment assistance' }
  ],
  企业分红记录: [
    { 资产ID: 'FIX001', 资产昵称: 'Rental Property (External)', 账户ID: 'ACC001', 账户昵称: 'Main Checking', 时间: '2024-01-15', 公司总分红: 20000, 币种: 'USD', 股份: 0.1, 分红金额: 2000, 分红备注: 'Quarterly rental surplus' }
  ]
};

export const BASE_CURRENCIES = ['USD', 'CNY', 'HKD', 'EUR', 'JPY', 'GBP'];
