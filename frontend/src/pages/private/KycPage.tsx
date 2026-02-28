import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/services/api'
import { Card, Button, Badge, Select, Skeleton } from '@/components/ui'
import type { KycStatus, KycDocumentType, KycDocument } from '@/types'

// --- Helpers ---

const KYC_STATUS_BADGE: Record<KycStatus, 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info'> = {
  not_started: 'default',
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
}

const DOC_TYPES: KycDocumentType[] = ['passport', 'id_card', 'drivers_license', 'utility_bill', 'selfie']

const ACCEPTED_FILE_TYPES = '.jpg,.jpeg,.png,.pdf'
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

// --- Document Icons ---

function DocumentIcon({ type }: { type: KycDocumentType }) {
  const iconPaths: Record<KycDocumentType, string> = {
    passport: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    id_card: 'M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V4a2 2 0 114 0v2m-4 0a2 2 0 104 0',
    drivers_license: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z',
    utility_bill: 'M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z',
    selfie: 'M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z M15 13a3 3 0 11-6 0 3 3 0 016 0z',
  }

  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={iconPaths[type]} />
    </svg>
  )
}

// --- Document Status Card ---

function DocumentStatusCard({ document }: { document: KycDocument }) {
  const { t } = useTranslation()

  return (
    <div className="flex items-center justify-between py-3 px-4 rounded-lg bg-surface-800 border border-surface-700">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-surface-700 flex items-center justify-center text-gray-400">
          <DocumentIcon type={document.type} />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-200">
            {t(`kyc.docType_${document.type}`)}
          </p>
          <p className="text-xs text-gray-500">
            {t('kyc.uploadedAt')}: {new Date(document.uploadedAt).toLocaleString()}
          </p>
          {document.reviewedAt && (
            <p className="text-xs text-gray-500">
              {t('kyc.reviewedAt')}: {new Date(document.reviewedAt).toLocaleString()}
            </p>
          )}
        </div>
      </div>
      <div className="text-right">
        <Badge variant={KYC_STATUS_BADGE[document.status]}>
          {t(`kyc.status_${document.status}`)}
        </Badge>
        {document.status === 'rejected' && document.rejectionReason && (
          <p className="text-xs text-red-400 mt-1 max-w-[200px]">{document.rejectionReason}</p>
        )}
      </div>
    </div>
  )
}

// --- Upload Form ---

function UploadSection() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedType, setSelectedType] = useState<string>('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)

  const uploadMutation = useMutation({
    mutationFn: (formData: FormData) => api.uploadKycDocument(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kycDocuments'] })
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      setSelectedFile(null)
      setSelectedType('')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    },
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null)
    const file = e.target.files?.[0]
    if (!file) {
      setSelectedFile(null)
      return
    }

    if (file.size > MAX_FILE_SIZE) {
      setFileError(t('kyc.fileTooLarge'))
      setSelectedFile(null)
      return
    }

    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!['jpg', 'jpeg', 'png', 'pdf'].includes(ext || '')) {
      setFileError(t('kyc.invalidFileType'))
      setSelectedFile(null)
      return
    }

    setSelectedFile(file)
  }

  const handleUpload = () => {
    if (!selectedFile || !selectedType) return

    const formData = new FormData()
    formData.append('file', selectedFile)
    formData.append('type', selectedType)
    uploadMutation.mutate(formData)
  }

  const docTypeOptions = DOC_TYPES.map((type) => ({
    value: type,
    label: t(`kyc.docType_${type}`),
  }))

  return (
    <Card>
      <h3 className="text-lg font-semibold text-gray-100 mb-4">{t('kyc.uploadDocument')}</h3>

      <div className="space-y-4">
        <Select
          label={t('kyc.documentType')}
          placeholder={t('kyc.selectDocumentType')}
          options={docTypeOptions}
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
        />

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">{t('kyc.file')}</label>
          <div className="relative">
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_FILE_TYPES}
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-surface-700 file:text-gray-200 hover:file:bg-surface-600 file:cursor-pointer cursor-pointer bg-surface-800 border border-surface-700 rounded-lg"
            />
          </div>
          {fileError && (
            <p className="mt-1 text-xs text-red-400">{fileError}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            {t('kyc.fileRequirements')}
          </p>
        </div>

        {selectedFile && (
          <div className="rounded-lg bg-surface-800 border border-surface-700 p-3 text-sm">
            <div className="flex justify-between text-gray-400">
              <span>{t('kyc.fileName')}</span>
              <span className="text-gray-200">{selectedFile.name}</span>
            </div>
            <div className="flex justify-between text-gray-400 mt-1">
              <span>{t('kyc.fileSize')}</span>
              <span className="text-gray-200">
                {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
              </span>
            </div>
          </div>
        )}

        {uploadMutation.isSuccess && (
          <p className="text-sm text-green-400">{t('kyc.uploadSuccess')}</p>
        )}
        {uploadMutation.isError && (
          <p className="text-sm text-red-400">{t('common.error')}</p>
        )}

        <Button
          onClick={handleUpload}
          isLoading={uploadMutation.isPending}
          disabled={!selectedFile || !selectedType}
          fullWidth
        >
          {t('kyc.uploadDocument')}
        </Button>
      </div>
    </Card>
  )
}

// --- Main Page ---

export default function KycPage() {
  const { t } = useTranslation()

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: api.getProfile,
  })

  const { data: documents, isLoading } = useQuery({
    queryKey: ['kycDocuments'],
    queryFn: api.getKycDocuments,
  })

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-100">{t('kyc.title')}</h1>

      {/* KYC Status Overview */}
      <Card className="bg-gradient-to-br from-surface-850 to-surface-800">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400 mb-1">{t('kyc.status')}</p>
            <div className="flex items-center gap-3">
              <Badge
                variant={KYC_STATUS_BADGE[profile?.kycStatus || 'not_started']}
                dot
                pulse={profile?.kycStatus === 'pending'}
              >
                {t(`kyc.status_${profile?.kycStatus || 'not_started'}`)}
              </Badge>
            </div>
          </div>
          <div className="w-16 h-16 rounded-full flex items-center justify-center bg-surface-700 text-gray-400">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>
        </div>

        {profile?.kycStatus === 'not_started' && (
          <p className="text-sm text-gray-400 mt-3">{t('kyc.notStartedHint')}</p>
        )}
        {profile?.kycStatus === 'pending' && (
          <p className="text-sm text-yellow-400 mt-3">{t('kyc.pendingHint')}</p>
        )}
        {profile?.kycStatus === 'approved' && (
          <p className="text-sm text-green-400 mt-3">{t('kyc.approvedHint')}</p>
        )}
        {profile?.kycStatus === 'rejected' && (
          <p className="text-sm text-red-400 mt-3">{t('kyc.rejectedHint')}</p>
        )}
      </Card>

      {/* Upload Section */}
      {profile?.kycStatus !== 'approved' && <UploadSection />}

      {/* Uploaded Documents */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-100 mb-4">{t('kyc.uploadedDocuments')}</h3>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} height={72} className="w-full rounded-lg" />
            ))}
          </div>
        ) : documents && documents.length > 0 ? (
          <div className="space-y-2">
            {documents.map((doc) => (
              <DocumentStatusCard key={doc.id} document={doc} />
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-sm text-center py-8">
            {t('kyc.noDocuments')}
          </p>
        )}
      </Card>

      {/* Required Documents Info */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-100 mb-4">{t('kyc.requiredDocuments')}</h3>
        <div className="space-y-3">
          {DOC_TYPES.map((type) => {
            const doc = documents?.find((d) => d.type === type)
            const isUploaded = !!doc
            const isApproved = doc?.status === 'approved'

            return (
              <div
                key={type}
                className="flex items-center gap-3 py-2 px-3 rounded-lg border border-surface-700"
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    isApproved
                      ? 'bg-green-900/30 text-green-400'
                      : isUploaded
                        ? 'bg-yellow-900/30 text-yellow-400'
                        : 'bg-surface-700 text-gray-500'
                  }`}
                >
                  {isApproved ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <DocumentIcon type={type} />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-200">{t(`kyc.docType_${type}`)}</p>
                  <p className="text-xs text-gray-500">{t(`kyc.docHint_${type}`)}</p>
                </div>
                {doc && (
                  <Badge variant={KYC_STATUS_BADGE[doc.status]}>
                    {t(`kyc.status_${doc.status}`)}
                  </Badge>
                )}
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}
