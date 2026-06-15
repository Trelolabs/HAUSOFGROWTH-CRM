import { Router } from 'express'
import leadsRoutes from './leads.routes'
import campaignsRoutes from './campaigns.routes'
import templatesRoutes from './templates.routes'
import dashboardRoutes from './dashboard.routes'
import webhooksRoutes from './webhooks.routes'

const router = Router()

router.use('/leads', leadsRoutes)
router.use('/campaigns', campaignsRoutes)
router.use('/templates', templatesRoutes)
router.use('/dashboard', dashboardRoutes)
router.use('/webhooks', webhooksRoutes)

export default router
