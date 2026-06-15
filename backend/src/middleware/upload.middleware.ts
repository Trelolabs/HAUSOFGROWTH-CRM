import multer, { FileFilterCallback } from 'multer'
import path from 'path'
import fs from 'fs'
import { Request } from 'express'
import { ApiError } from '../utils/ApiError'

const UPLOAD_DIR = '/tmp/crm-uploads'

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR)
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`
    cb(null, `${uniqueSuffix}${path.extname(file.originalname).toLowerCase()}`)
  },
})

const ALLOWED_MIMETYPES = [
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/csv',
  'text/plain',
]

const ALLOWED_EXTENSIONS = ['.csv', '.xlsx', '.xls']

function fileFilter(_req: Request, file: Express.Multer.File, cb: FileFilterCallback) {
  const ext = path.extname(file.originalname).toLowerCase()
  const mimeOk = ALLOWED_MIMETYPES.includes(file.mimetype)
  const extOk = ALLOWED_EXTENSIONS.includes(ext)

  if (mimeOk || extOk) {
    cb(null, true)
  } else {
    cb(new ApiError(400, 'Only .csv and .xlsx files are accepted', 'INVALID_FILE_TYPE'))
  }
}

export const uploadSingle = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 },
}).single('file')
