// Action system barrel exports
export * from './types'
export {
  executeAction,
  validateModeForAction,
  requiresConfirmation,
  type ExecutorContext,
  type ActionHandler,
  type ActionHandlers,
} from './executor'
export {
  campaignRunner,
  createCampaignRunner,
  CampaignRunState,
  VALID_TRANSITIONS,
  type CampaignRunProgress,
  type CampaignRunStore,
  type CampaignService,
} from './campaignRunner'
export { handleFindContacts } from './handlers/findContacts'
export type {
  SearchProvider,
  StagingService,
  SearchResult,
  StagedContact,
  FindContactsContext,
} from './handlers/findContacts'
export { createActionLogger } from './actionLogger'
export type { ActionLogEntry, ActionStats } from './actionLogger'
