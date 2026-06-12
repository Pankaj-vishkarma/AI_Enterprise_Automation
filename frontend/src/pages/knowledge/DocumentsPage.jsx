import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import MainLayout from '../../components/layout/MainLayout';
import { knowledgeAPI } from '../../api/knowledge';
import { Search, Upload, Trash2, X, FileText, AlertCircle, RefreshCw } from 'lucide-react';
import {
  appPageTitle, appPageDesc, appInputWithIcon, appBtnPrimary, appBtnGhost, appBtnIconDanger,
  appGlassCard, appEmpty, appModalOverlay, appModal, appError, appInputPlain, appSelect,
  appLabel, appPagination, appBadgeActive, appBadgeWarning,
} from '../../styles/appStyles';

const SUPPORTED_TYPES = [
  "Employee Handbooks",
  "Company Policies",
  "SOPs",
  "Contracts",
  "Product Documentation",
  "User Guides",
  "Training Materials",
  "FAQ Documents",
  "Internal Documentation"
];

export default function DocumentsPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);

  // Upload Modal State
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadType, setUploadType] = useState(SUPPORTED_TYPES[0]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadError, setUploadError] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Query documents list
  const { data: docsData, isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: () => knowledgeAPI.listDocuments(),
  });

  const docsList = docsData?.data || [];
  const filteredDocs = docsList.filter(doc => 
    doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (doc.file_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const total = filteredDocs.length;
  const totalPages = Math.ceil(total / 10) || 1;
  const documents = filteredDocs.slice((page - 1) * 10, page * 10);

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: ({ title, type, file }) => knowledgeAPI.uploadDocument(title, type, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setIsUploadOpen(false);
      setUploadTitle('');
      setUploadType(SUPPORTED_TYPES[0]);
      setSelectedFile(null);
      setUploadError('');
    },
    onError: (err) => {
      setUploadError(err.response?.data?.detail || 'Failed to upload document. Please try again.');
    }
  });

  // Disable (Delete) mutation
  const disableMutation = useMutation({
    mutationFn: (id) => knowledgeAPI.deleteDocument(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
    onError: (err) => {
      alert(err.response?.data?.detail || 'Failed to delete document.');
    }
  });

  const retryMutation = useMutation({
    mutationFn: (id) => knowledgeAPI.retryIngest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
    onError: (err) => {
      alert(err.response?.data?.detail || 'Failed to retry ingestion.');
    }
  });

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      if (!uploadTitle) {
        // Remove extension for default title
        const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
        setUploadTitle(nameWithoutExt);
      }
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadTitle.trim() || !selectedFile) {
      setUploadError('Please fill in all fields and select a file.');
      return;
    }

    setIsUploading(true);
    setUploadError('');
    try {
      await uploadMutation.mutateAsync({
        title: uploadTitle,
        type: uploadType,
        file: selectedFile
      });
    } catch {
      // Error handled by mutation
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this document?')) {
      disableMutation.mutate(id);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className={appPageTitle}>Knowledge Documents</h1>
          <p className={appPageDesc}>Manage your organization&apos;s knowledge base documents</p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6A6A60]" size={18} />
              <input
                type="text"
                placeholder="Search documents..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className={appInputWithIcon}
              />
            </div>
          </div>
          <button onClick={() => setIsUploadOpen(true)} className={appBtnPrimary}>
            <Upload size={18} />
            Upload Document
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading ? (
            <div className="col-span-full flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#1A1A14]/10 border-t-[#1A1A14]" />
            </div>
          ) : documents.length === 0 ? (
            <div className={`col-span-full ${appEmpty} border border-dashed border-[#1A1A14]/15 rounded-2xl`}>
              No active documents found. Upload a file to populate your knowledge base.
            </div>
          ) : (
            documents.map((doc) => (
              <div key={doc.id} className={`${appGlassCard} relative flex flex-col justify-between`}>
                <div>
                  <div className="flex items-start justify-between gap-2 mb-4">
                    <div className="flex items-center gap-2">
                      <FileText className="text-[#1A1A14] flex-shrink-0" size={22} />
                      <h3 className="text-base font-semibold text-[#1A1A14] line-clamp-2" title={doc.title}>{doc.title}</h3>
                    </div>
                    <button 
                      onClick={() => handleDelete(doc.id)}
                      className={appBtnIconDanger}
                      title="Disable document"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>

                  <div className="space-y-2 text-sm text-[#6A6A60]">
                    <p className="truncate"><strong className="text-[#1A1A14]">File:</strong> {doc.file_name}</p>
                    <p><strong className="text-[#1A1A14]">Type:</strong> {doc.document_type}</p>
                    <div className="flex items-center gap-1">
                      <strong className="text-[#1A1A14]">Status:</strong>
                      <span className={
                        doc.status === 'processed' || doc.status === 'active' || doc.status === 'ingest_queued'
                          ? appBadgeActive
                          : appBadgeWarning
                      }>
                        {doc.status}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 border-t border-[#1A1A14]/10 pt-4 text-xs text-[#6A6A60] flex justify-between items-center">
                  <span>ID: #{doc.id}</span>
                  <div className="flex items-center gap-2">
                    {doc.status === 'failed' && (
                      <button
                        onClick={() => retryMutation.mutate(doc.id)}
                        className="text-[#1A1A14] hover:underline inline-flex items-center gap-1 font-medium"
                      >
                        <RefreshCw size={12} />
                        Retry
                      </button>
                    )}
                    <span>Active: {doc.is_active ? 'Yes' : 'No'}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="py-4 flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
            <span className="text-sm text-[#6A6A60]">
              Showing {((page - 1) * 10) + 1} to {Math.min(page * 10, total)} of {total} documents
            </span>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className={appPagination}>
                Previous
              </button>
              <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className={appPagination}>
                Next
              </button>
            </div>
          </div>
        )}

        {/* Upload Modal */}
        {isUploadOpen && (
          <div className={appModalOverlay}>
            <div className={`${appModal} max-w-md`} onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-[#1A1A14] flex items-center gap-2">
                  <Upload size={20} />
                  Upload Document
                </h2>
                <button onClick={() => setIsUploadOpen(false)} className="text-[#6A6A60] hover:text-[#1A1A14] p-1 rounded-lg hover:bg-[#1A1A14]/5">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleUploadSubmit} className="space-y-4">
                {uploadError && (
                  <div className={`${appError} flex items-center gap-2`}>
                    <AlertCircle size={16} className="flex-shrink-0" />
                    <span>{uploadError}</span>
                  </div>
                )}

                <div>
                  <label className={appLabel}>Document Title</label>
                  <input type="text" required value={uploadTitle} onChange={(e) => setUploadTitle(e.target.value)} placeholder="Enter document title" className={appInputPlain} />
                </div>

                <div>
                  <label className={appLabel}>Document Type</label>
                  <select value={uploadType} onChange={(e) => setUploadType(e.target.value)} className={appSelect}>
                    {SUPPORTED_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={appLabel}>Choose File (PDF, DOCX, TXT)</label>
                  <div className="border border-dashed border-[#1A1A14]/15 rounded-xl p-4 text-center cursor-pointer hover:bg-[#1A1A14]/5 transition relative">
                    <input type="file" required accept=".pdf,.docx,.txt" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                    <Upload className="mx-auto text-[#6A6A60] mb-2" size={24} />
                    <span className="text-sm text-[#6A6A60] truncate block">
                      {selectedFile ? selectedFile.name : 'Click to browse or drag & drop'}
                    </span>
                  </div>
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t border-[#1A1A14]/10">
                  <button type="button" onClick={() => setIsUploadOpen(false)} className={appBtnGhost}>Cancel</button>
                  <button type="submit" disabled={isUploading || !selectedFile} className={appBtnPrimary}>
                    {isUploading ? 'Uploading...' : 'Submit'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
