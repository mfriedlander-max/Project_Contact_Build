// Integration barrel exports
export {
  searchProvider,
  type SearchResult,
  type SearchOptions,
} from './searchProvider'
export {
  pageFetcher,
  type FetchedPage,
  type FetchOptions,
} from './pageFetcher'
export {
  gmailService,
  type GmailDraft,
  type CreateDraftOptions,
  type SendOptions,
} from './gmailService'
export {
  hunterService,
  type EmailFindResult,
  type EmailFindOptions,
} from './hunterService'
export {
  generateInsert,
  type ContactInfo,
  type InsertResult,
} from './insertGenerator'

// Pipeline stage executors
export {
  executeEmailFindingStage,
  type EmailFindingStageResult,
} from './stages/emailFindingStage'
export {
  executeInsertStage,
  type InsertStageResult,
} from './stages/insertStage'
export {
  executeDraftStage,
  type DraftStageResult,
} from './stages/draftStage'
export type { TemplateInput } from './stages/draftStage'
export {
  executeSendStage,
  type SendStageResult,
} from './stages/sendStage'
export {
  checkForReplies,
  type ReplyCheckResult,
} from './stages/gmailSync'
export type { StageError, ProgressCallback } from './stages/types'
