// Single import source for all Prisma-generated types.
// Import from here instead of @prisma/client directly so the IDE always
// resolves enums from the generated barrel and postinstall keeps it fresh.
export {
  PrismaClient,
  Prisma,
  LeadSource,
  LeadStatus,
  CampaignType,
  CampaignStatus,
  RecipientStatus,
} from '@prisma/client'

export type {
  Lead,
  Campaign,
  CampaignRecipient,
  EmailTemplate,
  SMSTemplate,
} from '@prisma/client'
