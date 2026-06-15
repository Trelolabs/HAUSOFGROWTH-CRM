import { Router } from 'express'

const router = Router()

// Placeholder — implemented in Phase 2 Step 8
router.get('/', (_req, res) => res.json({ success: true, data: [], meta: { total: 0, page: 1, limit: 20 } }))

export default router
