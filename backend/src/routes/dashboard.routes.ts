import { Router } from 'express'
import {
  getStats,
  getCampaignChart,
  getLeadsChart,
} from '../controllers/dashboard.controller'

const router = Router()

router.get('/stats', getStats)
router.get('/campaign-chart', getCampaignChart)
router.get('/leads-chart', getLeadsChart)

export default router
