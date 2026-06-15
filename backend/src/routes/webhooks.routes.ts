import { Router } from 'express'

const router = Router()

// Placeholder — implemented in Phase 2 Step 9
router.post('/lead', (_req, res) => res.status(200).json({ success: true }))
router.post('/resend', (_req, res) => res.status(200).json({ success: true }))
router.post('/twilio', (_req, res) => res.status(200).json({ success: true }))

export default router
