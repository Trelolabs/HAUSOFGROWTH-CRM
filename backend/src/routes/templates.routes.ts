import { Router } from 'express'
import {
  getEmailTemplates,
  createEmailTemplate,
  updateEmailTemplate,
  deleteEmailTemplate,
  getSMSTemplates,
  createSMSTemplate,
  updateSMSTemplate,
  deleteSMSTemplate,
} from '../controllers/templates.controller'

const router = Router()

router.get('/email', getEmailTemplates)
router.post('/email', createEmailTemplate)
router.put('/email/:id', updateEmailTemplate)
router.delete('/email/:id', deleteEmailTemplate)

router.get('/sms', getSMSTemplates)
router.post('/sms', createSMSTemplate)
router.put('/sms/:id', updateSMSTemplate)
router.delete('/sms/:id', deleteSMSTemplate)

export default router
