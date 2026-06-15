import { Router } from 'express'

const router = Router()

// Placeholder — implemented in Phase 3 Step 18
router.get('/', (_req, res) => res.json({ success: true, data: [], meta: { total: 0, page: 1, limit: 20 } }))

export default router
