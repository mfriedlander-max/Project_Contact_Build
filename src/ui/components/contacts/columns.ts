export const COLUMNS = [
  { key: 'name', label: 'Name', fixed: true },
  { key: 'company', label: 'Company', fixed: false },
  { key: 'email', label: 'Email', fixed: true },
  { key: 'connection_stage', label: 'Stage', fixed: true },
  { key: 'email_status', label: 'Email Status', fixed: false },
  { key: 'mobile_phone', label: 'Phone', fixed: false },
  { key: 'social_linkedin', label: 'LinkedIn', fixed: false },
  { key: 'campaign', label: 'Campaign', fixed: false },
  { key: 'email_confidence', label: 'Confidence', fixed: false },
  { key: 'personalized_insert', label: 'Insert Preview', fixed: false },
] as const

export type ColumnKey = (typeof COLUMNS)[number]['key']
