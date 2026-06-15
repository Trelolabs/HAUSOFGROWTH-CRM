import { Router } from 'express'
import {
  getLeads,
  createLead,
  getLeadById,
  updateLead,
  deleteLead,
} from '../controllers/leads.controller'

const router = Router()

router.get('/', getLeads)
router.post('/', createLead)
router.get('/:id', getLeadById)
router.patch('/:id', updateLead)
router.delete('/:id', deleteLead)

export default router
