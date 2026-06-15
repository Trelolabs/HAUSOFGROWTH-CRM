import { Router } from 'express'
import {
  inboundLead,
  resendWebhook,
  twilioWebhook,
} from '../controllers/webhooks.controller'

const router = Router()

router.post('/lead', inboundLead)
router.post('/resend', resendWebhook)
router.post('/twilio', twilioWebhook)

export default router
