// Action system barrel exports
export * from './types'
export {
  executeAction,
  validateModeForAction,
  requiresConfirmation,
  createExecutor,
  type ExecutorContext,
  type ExecutorDeps,
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
export { handleShowStagedResults } from './handlers/showStagedResults'
export { handleDeleteStagedRow } from './handlers/deleteStagedRow'
export { handleApproveStagedList } from './handlers/approveStagedList'
export { handleRunCampaignStage } from './handlers/runCampaignStage'
export { handleQueryContacts } from './handlers/queryContacts'
export {
  handleMoveStage,
  handleUpdateField,
  handleBulkUpdate,
  handleDeleteContacts,
} from './handlers/mutationHandlers'
export { handleCreateSavedView } from './handlers/createSavedView'
export { createActionLogger } from './actionLogger'
export type { ActionLogEntry, ActionStats } from './actionLogger'
export type {
  StagingServiceDeps,
  ApproveServiceDeps,
  ContactServiceDeps,
  SavedViewServiceDeps,
  StageExecutors,
  Contact,
  ContactFilters,
  Campaign,
  SavedView,
  StageResult,
} from './handlers/interfaces'
