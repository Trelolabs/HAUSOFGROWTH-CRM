import { Router } from 'express'
import { uploadSingle } from '../middleware/upload.middleware'
import {
  getCampaigns,
  getCampaignById,
  getCampaignProgress,
  getCampaignRecipients,
  createCampaign,
  sendCampaign,
  exportFailedRecipients,
  parseUploadedFile,
  validateEmailsHandler,
  validatePhonesHandler,
} from '../controllers/campaigns.controller'

const router = Router()

// Static routes MUST come before /:id to avoid param collision
router.post('/parse-file', uploadSingle, parseUploadedFile)
router.post('/validate-emails', validateEmailsHandler)
router.post('/validate-phones', validatePhonesHandler)

router.get('/', getCampaigns)
router.post('/', createCampaign)

router.get('/:id', getCampaignById)
router.get('/:id/progress', getCampaignProgress)
router.post('/:id/send', sendCampaign)
router.get('/:id/recipients', getCampaignRecipients)
router.get('/:id/export-failed', exportFailedRecipients)

export default router
