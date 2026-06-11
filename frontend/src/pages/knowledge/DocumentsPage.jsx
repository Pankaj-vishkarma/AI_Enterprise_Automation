import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import MainLayout from '../../components/layout/MainLayout';
import { knowledgeAPI } from '../../api/knowledge';
import { Plus, Search, Upload, Trash2, X, FileText, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

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
          <h1 className="text-3xl font-bold text-foreground">Knowledge Documents</h1>
          <p className="text-muted-foreground mt-2">Manage your organization's knowledge base documents</p>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-muted-foreground" size={20} />
              <input
                type="text"
                placeholder="Search documents..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-input focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
              />
            </div>
          </div>
          <button 
            onClick={() => setIsUploadOpen(true)}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition cursor-pointer"
          >
            <Upload size={20} />
            Upload Document
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading ? (
            <div className="col-span-full text-center py-12 flex justify-center items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : documents.length === 0 ? (
            <div className="col-span-full text-center py-12 bg-card border border-border border-dashed rounded-lg text-muted-foreground">
              No active documents found. Upload a file to populate your knowledge base.
            </div>
          ) : (
            documents.map((doc) => (
              <div key={doc.id} className="bg-card border border-border rounded-lg p-6 hover:shadow-md transition relative flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-4">
                    <div className="flex items-center gap-2">
                      <FileText className="text-primary flex-shrink-0" size={24} />
                      <h3 className="text-lg font-semibold text-foreground line-clamp-2" title={doc.title}>{doc.title}</h3>
                    </div>
                    <button 
                      onClick={() => handleDelete(doc.id)}
                      className="text-destructive hover:bg-red-50 p-2 rounded-lg transition cursor-pointer"
                      title="Disable document"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>

                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p className="truncate"><strong className="text-foreground">File:</strong> {doc.file_name}</p>
                    <p><strong className="text-foreground">Type:</strong> {doc.document_type}</p>
                    <div className="flex items-center gap-1">
                      <strong className="text-foreground">Status:</strong>
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                        doc.status === 'processed' || doc.status === 'active' || doc.status === 'ingest_queued'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {doc.status}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 border-t border-border pt-4 text-xs text-muted-foreground flex justify-between items-center">
                  <span>ID: #{doc.id}</span>
                  <div className="flex items-center gap-2">
                    {doc.status === 'failed' && (
                      <button
                        onClick={() => retryMutation.mutate(doc.id)}
                        className="text-primary hover:underline inline-flex items-center gap-1"
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
          <div className="px-6 py-4 flex items-center justify-between border-t border-border mt-4">
            <span className="text-sm text-muted-foreground">
              Showing {((page - 1) * 10) + 1} to {Math.min(page * 10, total)} of {total} documents
            </span>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="px-4 py-2 border border-border rounded-lg hover:bg-secondary disabled:opacity-50 transition cursor-pointer text-foreground"
              >
                Previous
              </button>
              <button
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
                className="px-4 py-2 border border-border rounded-lg hover:bg-secondary disabled:opacity-50 transition cursor-pointer text-foreground"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Upload Modal */}
        {isUploadOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-xl shadow-lg w-full max-w-md overflow-hidden">
              <div className="flex justify-between items-center px-6 py-4 border-b border-border bg-secondary">
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <Upload size={20} className="text-primary" />
                  Upload Document
                </h2>
                <button 
                  onClick={() => setIsUploadOpen(false)}
                  className="text-muted-foreground hover:text-foreground p-1 rounded-lg transition cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleUploadSubmit} className="p-6 space-y-4">
                {uploadError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
                    <AlertCircle size={16} className="flex-shrink-0" />
                    <span>{uploadError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Document Title</label>
                  <input
                    type="text"
                    required
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    placeholder="Enter document title"
                    className="w-full px-4 py-2 border border-border rounded-lg bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Document Type</label>
                  <select
                    value={uploadType}
                    onChange={(e) => setUploadType(e.target.value)}
                    className="w-full px-4 py-2 border border-border rounded-lg bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {SUPPORTED_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Choose File (PDF, DOCX, TXT)</label>
                  <div className="border border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:bg-secondary transition relative">
                    <input
                      type="file"
                      required
                      accept=".pdf,.docx,.txt"
                      onChange={handleFileChange}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <Upload className="mx-auto text-muted-foreground mb-2" size={24} />
                    <span className="text-sm text-muted-foreground truncate block">
                      {selectedFile ? selectedFile.name : 'Click to browse or drag & drop'}
                    </span>
                  </div>
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setIsUploadOpen(false)}
                    className="px-4 py-2 border border-border rounded-lg hover:bg-secondary transition cursor-pointer text-foreground"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUploading || !selectedFile}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition flex items-center gap-2 cursor-pointer"
                  >
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
