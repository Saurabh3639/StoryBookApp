'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Upload,
  Plus,
  BookOpen,
  Trash2,
  Edit3,
  FileText,
  Image as ImageIcon,
  CheckCircle,
  AlertCircle,
  FolderPlus,
  Sparkles,
  Loader2,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react'

interface Category {
  id: string
  name: string
  slug: string
}

interface Book {
  id: string
  title: string
  description: string
  category_id: string
  pdf_path: string
  cover_path: string | null
  page_count: number | null
  created_at: string
  categories?: {
    id: string
    name: string
    slug: string
  } | null
}

export default function AdminPage() {
  const supabase = createClient()

  // State
  const [categories, setCategories] = useState<Category[]>([])
  const [books, setBooks] = useState<Book[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const BOOKS_PER_PAGE = 10

  // Upload Form State
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  // File input refs for full DOM file reset
  const pdfInputRef = useRef<HTMLInputElement | null>(null)
  const coverInputRef = useRef<HTMLInputElement | null>(null)

  // Toast / Alert Notifications
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Inline Category Modal
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [creatingCat, setCreatingCat] = useState(false)

  // Edit Book Modal
  const [editingBook, setEditingBook] = useState<Book | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editCategoryId, setEditCategoryId] = useState('')
  const [editPdfFile, setEditPdfFile] = useState<File | null>(null)
  const [editCoverFile, setEditCoverFile] = useState<File | null>(null)
  const [removeCover, setRemoveCover] = useState(false)
  const [updatingBook, setUpdatingBook] = useState(false)

  // Edit file input refs
  const editPdfInputRef = useRef<HTMLInputElement | null>(null)
  const editCoverInputRef = useRef<HTMLInputElement | null>(null)

  // Delete Confirmation State
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [bookToDelete, setBookToDelete] = useState<{ id: string; title: string } | null>(null)

  useEffect(() => {
    fetchInitialData()
  }, [])

  const showNotification = (type: 'success' | 'error', message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 5000)
  }

  const fetchInitialData = async () => {
    setLoadingData(true)
    try {
      // Fetch categories
      const { data: catData } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true })

      if (catData) setCategories(catData)

      // Fetch books with category info
      const { data: bookData, error } = await supabase
        .from('books')
        .select('*, categories(id, name, slug)')
        .order('created_at', { ascending: false })

      if (error) throw error
      if (bookData) setBooks(bookData as any)
    } catch (err: any) {
      showNotification('error', `Failed to load data: ${err.message}`)
    } finally {
      setLoadingData(false)
    }
  }

  // Handle Upload Submission
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pdfFile) {
      showNotification('error', 'Please select a PDF file to upload')
      return
    }

    setUploading(true)
    setUploadProgress(20)

    try {
      const formData = new FormData()
      formData.append('title', title)
      formData.append('description', description)
      formData.append('categoryId', categoryId)
      formData.append('pdfFile', pdfFile)
      if (coverFile) {
        formData.append('coverFile', coverFile)
      }

      setUploadProgress(50)

      const res = await fetch('/api/admin/books/upload', {
        method: 'POST',
        body: formData,
      })

      const result = await res.json()

      if (!res.ok) {
        throw new Error(result.error || 'Upload failed')
      }

      setUploadProgress(100)
      showNotification('success', `Book "${title}" uploaded successfully with ${result.book.page_count || 1} pages!`)

      // Reset form and file data completely
      setTitle('')
      setDescription('')
      setCategoryId('')
      setPdfFile(null)
      setCoverFile(null)
      if (pdfInputRef.current) pdfInputRef.current.value = ''
      if (coverInputRef.current) coverInputRef.current.value = ''

      // Refresh books table
      if (result.book) {
        setBooks([result.book, ...books])
        setCurrentPage(1)
      } else {
        fetchInitialData()
      }
    } catch (err: any) {
      showNotification('error', err.message || 'Error uploading book')
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  // Handle Add Inline Category
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCatName.trim()) return

    setCreatingCat(true)
    try {
      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCatName }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create category')

      setCategories([...categories, data.category])
      setCategoryId(data.category.id)
      setNewCatName('')
      setShowCategoryModal(false)
      showNotification('success', `Category "${data.category.name}" added!`)
    } catch (err: any) {
      showNotification('error', err.message)
    } finally {
      setCreatingCat(false)
    }
  }

  // Open Delete Confirmation Modal
  const handleDeleteBook = (id: string, bookTitle: string) => {
    setBookToDelete({ id, title: bookTitle })
  }

  // Confirm and Execute Book Deletion
  const handleConfirmDelete = async () => {
    if (!bookToDelete) return
    const { id, title: bookTitle } = bookToDelete

    setDeletingId(id)
    try {
      const res = await fetch(`/api/admin/books/${id}`, {
        method: 'DELETE',
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to delete book')

      setBooks(books.filter((b) => b.id !== id))
      showNotification('success', `"${bookTitle}" deleted successfully.`)
      setBookToDelete(null)
    } catch (err: any) {
      showNotification('error', err.message)
    } finally {
      setDeletingId(null)
    }
  }

  // Start Editing Book
  const openEditModal = (book: Book) => {
    setEditingBook(book)
    setEditTitle(book.title)
    setEditDescription(book.description)
    setEditCategoryId(book.category_id || '')
    setEditPdfFile(null)
    setEditCoverFile(null)
    setRemoveCover(false)
    if (editPdfInputRef.current) editPdfInputRef.current.value = ''
    if (editCoverInputRef.current) editCoverInputRef.current.value = ''
  }

  const handleUpdateBook = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingBook) return

    setUpdatingBook(true)
    try {
      const formData = new FormData()
      formData.append('title', editTitle)
      formData.append('description', editDescription)
      formData.append('categoryId', editCategoryId)

      if (editPdfFile) {
        formData.append('pdfFile', editPdfFile)
      }
      if (editCoverFile) {
        formData.append('coverFile', editCoverFile)
      }
      if (removeCover) {
        formData.append('removeCover', 'true')
      }

      const res = await fetch(`/api/admin/books/${editingBook.id}`, {
        method: 'PATCH',
        body: formData,
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update book')

      setBooks(books.map((b) => (b.id === editingBook.id ? data.book : b)))
      setEditingBook(null)
      showNotification('success', 'Storybook details & files updated!')
    } catch (err: any) {
      showNotification('error', err.message)
    } finally {
      setUpdatingBook(false)
    }
  }

  // Ensure current page is within valid range when books list changes
  useEffect(() => {
    const total = Math.ceil(books.length / BOOKS_PER_PAGE) || 1
    if (currentPage > total) {
      setCurrentPage(total)
    }
  }, [books.length, currentPage])

  // Pagination calculations
  const totalPages = Math.ceil(books.length / BOOKS_PER_PAGE) || 1
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages)
  const startIndex = (safeCurrentPage - 1) * BOOKS_PER_PAGE
  const endIndex = Math.min(startIndex + BOOKS_PER_PAGE, books.length)
  const paginatedBooks = books.slice(startIndex, endIndex)

  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }
    if (safeCurrentPage <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages]
    }
    if (safeCurrentPage >= totalPages - 3) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages]
    }
    return [1, '...', safeCurrentPage - 1, safeCurrentPage, safeCurrentPage + 1, '...', totalPages]
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 p-4 rounded-xl shadow-2xl flex items-center gap-3 border transition-all animate-bounce ${
          toast.type === 'success' ? 'bg-slate-900 border-emerald-500/40 text-emerald-300' : 'bg-slate-900 border-rose-500/40 text-rose-300'
        }`}>
          {toast.type === 'success' ? <CheckCircle className="w-5 h-5 text-emerald-400" /> : <AlertCircle className="w-5 h-5 text-rose-400" />}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}

      {/* Page Title */}
      <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Admin Dashboard</h1>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Upload new storybook PDFs, manage categories, and audit published titles.
          </p>
        </div>
      </div>

      {/* Upload Form Section */}
      <div className="glass-panel p-6 sm:p-8 rounded-2xl mb-12 relative overflow-hidden">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-700/60">
          <div className="w-10 h-10 rounded-xl bg-purple-900/60 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Upload className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Upload New Storybook</h2>
            <p className="text-xs text-slate-400">PDF page count will be automatically extracted server-side</p>
          </div>
        </div>

        <form onSubmit={handleUploadSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Title */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Book Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. The Enchanted Forest Dragon"
                className="w-full px-4 py-3 rounded-xl bg-slate-900/90 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 text-sm"
              />
            </div>

            {/* Category Dropdown & Add Inline Button */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Category *
                </label>
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(true)}
                  className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 font-medium"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                  <span>+ New Category</span>
                </button>
              </div>
              <select
                required
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-900/90 border border-slate-700 text-white focus:outline-none focus:border-purple-500 text-sm"
              >
                <option value="">Select a Category...</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Book Description *
            </label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Write a brief magical summary of the story..."
              className="w-full px-4 py-3 rounded-xl bg-slate-900/90 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 text-sm resize-none"
            />
          </div>

          {/* File Pickers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* PDF Picker */}
            <div className="p-4 rounded-xl bg-slate-900/60 border border-dashed border-slate-700 hover:border-purple-500/50 transition-colors">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-400" />
                <span>Storybook PDF File *</span>
              </label>
              <input
                ref={pdfInputRef}
                type="file"
                required
                accept=".pdf,application/pdf"
                onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                className="block w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-purple-900/50 file:text-purple-300 hover:file:bg-purple-800/60 cursor-pointer"
              />
              {pdfFile && (
                <p className="text-xs text-purple-300 mt-2 truncate font-medium">
                  Selected: {pdfFile.name} ({(pdfFile.size / (1024 * 1024)).toFixed(2)} MB)
                </p>
              )}
            </div>

            {/* Optional Cover Picker */}
            <div className="p-4 rounded-xl bg-slate-900/60 border border-dashed border-slate-700 hover:border-pink-500/50 transition-colors">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-pink-400" />
                <span>Optional Cover Thumbnail</span>
              </label>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
                className="block w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-pink-900/50 file:text-pink-300 hover:file:bg-pink-800/60 cursor-pointer"
              />
              {coverFile ? (
                <p className="text-xs text-pink-300 mt-2 truncate font-medium">
                  Selected: {coverFile.name}
                </p>
              ) : (
                <p className="text-[11px] text-slate-500 mt-2">
                  (If omitted, a stylized title card will be automatically generated)
                </p>
              )}
            </div>

          </div>

          {/* Progress Bar */}
          {uploading && (
            <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden border border-slate-800">
              <div
                className="bg-gradient-to-r from-purple-500 to-pink-500 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={uploading}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold text-sm shadow-xl shadow-purple-600/25 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing & Uploading Storybook...</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span>Publish Storybook to Library</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Books List Section */}
      <div className="glass-panel p-6 sm:p-8 rounded-2xl">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-700/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-900/60 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Published Storybooks</h2>
              <p className="text-xs text-slate-400">
                {books.length === 0
                  ? '0 total books in catalog'
                  : `Showing ${startIndex + 1}–${endIndex} of ${books.length} total books`}
              </p>
            </div>
          </div>
        </div>

        {loadingData ? (
          <div className="py-12 text-center text-slate-400 flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
            <p className="text-sm">Loading storybook directory...</p>
          </div>
        ) : books.length === 0 ? (
          <div className="py-12 text-center text-slate-500">
            <p className="text-sm">No storybooks uploaded yet. Use the form above to add your first book!</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900/80 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Book Title</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Pages</th>
                  <th className="py-3.5 px-4">Uploaded</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {paginatedBooks.map((book) => (
                  <tr key={book.id} className="hover:bg-slate-900/40 transition-colors">
                    
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-11 rounded bg-slate-800 border border-slate-700 overflow-hidden flex-shrink-0 flex items-center justify-center text-purple-400 text-xs font-bold">
                          {book.cover_path ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/covers/${book.cover_path}`}
                              alt={book.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span>PDF</span>
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-white max-w-xs truncate">{book.title}</p>
                          <p className="text-xs text-slate-400 line-clamp-1 max-w-sm">{book.description}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-purple-950/60 text-purple-300 border border-purple-500/20">
                        {book.categories?.name || 'Uncategorized'}
                      </span>
                    </td>

                    <td className="py-4 px-4 font-medium text-slate-200">
                      {book.page_count ? `${book.page_count} pages` : '—'}
                    </td>

                    <td className="py-4 px-4 text-xs text-slate-400">
                      {new Date(book.created_at).toLocaleDateString()}
                    </td>

                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(book)}
                          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-purple-300 border border-slate-700 transition-colors"
                          title="Edit details"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteBook(book.id, book.title)}
                          disabled={deletingId === book.id}
                          className="p-2 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-300 hover:text-rose-400 border border-slate-700 hover:border-rose-500/30 transition-colors disabled:opacity-50"
                          title="Delete book"
                        >
                          {deletingId === book.id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-rose-400" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-5 border-t border-slate-800 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <span>
                  Showing <strong className="text-white font-medium">{startIndex + 1}</strong> to{' '}
                  <strong className="text-white font-medium">{endIndex}</strong> of{' '}
                  <strong className="text-white font-medium">{books.length}</strong> books
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={safeCurrentPage === 1}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1 font-medium"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Previous</span>
                </button>

                <div className="flex items-center gap-1">
                  {getPageNumbers().map((pageItem, idx) =>
                    pageItem === '...' ? (
                      <span key={`ellipsis-${idx}`} className="px-2 py-1 text-slate-500 font-semibold select-none">
                        ...
                      </span>
                    ) : (
                      <button
                        key={`page-${pageItem}`}
                        onClick={() => setCurrentPage(pageItem as number)}
                        className={`min-w-[32px] h-8 rounded-lg text-xs font-semibold transition-all ${
                          safeCurrentPage === pageItem
                            ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                            : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60'
                        }`}
                      >
                        {pageItem}
                      </button>
                    )
                  )}
                </div>

                <button
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={safeCurrentPage === totalPages}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1 font-medium"
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
        )}
      </div>

      {/* Inline Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-2xl w-full max-w-md shadow-2xl relative">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-purple-400" />
                <span>Add New Category</span>
              </h3>
              <button
                onClick={() => setShowCategoryModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Category Name
                </label>
                <input
                  type="text"
                  required
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="e.g. Science Fiction & Space"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingCat}
                  className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 flex items-center gap-1.5 disabled:opacity-50"
                >
                  {creatingCat ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>Save Category</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Book Modal */}
      {editingBook && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel p-6 sm:p-7 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl relative">
            <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-700/60">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-purple-400" />
                <span>Edit Storybook</span>
              </h3>
              <button
                onClick={() => setEditingBook(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateBook} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Book Title *
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Category *
                </label>
                <select
                  value={editCategoryId}
                  onChange={(e) => setEditCategoryId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-purple-500"
                >
                  <option value="">Select Category...</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Description *
                </label>
                <textarea
                  required
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>

              {/* Storybook PDF File Management */}
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-700/80 space-y-3">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-4 h-4 text-purple-400" />
                  <span>Storybook PDF File</span>
                </label>

                {/* Current PDF information */}
                <div className="flex items-center justify-between text-xs bg-slate-950/80 p-2.5 rounded-lg border border-slate-800">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-purple-900/60 text-purple-300 border border-purple-500/30">
                      CURRENT
                    </span>
                    <span className="text-slate-300 truncate font-mono text-[11px]">
                      {editingBook.pdf_path}
                    </span>
                  </div>
                  <span className="text-slate-400 shrink-0 text-[11px]">
                    {editingBook.page_count ? `${editingBook.page_count} pages` : ''}
                  </span>
                </div>

                {/* Replace with new PDF input */}
                <div>
                  <p className="text-[11px] text-slate-400 mb-1.5 font-medium">
                    Upload new PDF to replace current file:
                  </p>
                  <input
                    ref={editPdfInputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={(e) => setEditPdfFile(e.target.files?.[0] || null)}
                    className="block w-full text-xs text-slate-400 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-purple-900/50 file:text-purple-300 hover:file:bg-purple-800/60 cursor-pointer"
                  />
                  {editPdfFile && (
                    <div className="flex items-center justify-between mt-2 p-2 rounded-lg bg-purple-950/40 border border-purple-500/30 text-xs text-purple-300">
                      <span className="truncate">
                        New PDF: <strong>{editPdfFile.name}</strong> ({(editPdfFile.size / (1024 * 1024)).toFixed(2)} MB)
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setEditPdfFile(null)
                          if (editPdfInputRef.current) editPdfInputRef.current.value = ''
                        }}
                        className="text-slate-400 hover:text-white ml-2 shrink-0 p-0.5"
                        title="Cancel new PDF"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Cover Thumbnail Management */}
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-700/80 space-y-3">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-pink-400" />
                  <span>Cover Thumbnail</span>
                </label>

                {/* Current Cover Display & Removal option */}
                {editingBook.cover_path && !removeCover && !editCoverFile && (
                  <div className="flex items-center justify-between bg-slate-950/80 p-2.5 rounded-lg border border-slate-800">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-13 rounded bg-slate-800 border border-slate-700 overflow-hidden shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/covers/${editingBook.cover_path}`}
                          alt="Current cover"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-pink-900/60 text-pink-300 border border-pink-500/30 block w-fit mb-1">
                          CURRENT COVER
                        </span>
                        <span className="text-slate-300 truncate font-mono text-[11px] block max-w-xs">
                          {editingBook.cover_path}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setRemoveCover(true)}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-300 hover:text-white bg-rose-950/60 hover:bg-rose-900 border border-rose-500/30 flex items-center gap-1.5 transition-colors shrink-0"
                      title="Remove cover thumbnail"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  </div>
                )}

                {/* Cover Removal Notice */}
                {removeCover && !editCoverFile && (
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-rose-950/30 border border-rose-500/30 text-xs text-rose-300">
                    <span>Cover thumbnail will be removed. Default gradient cover will be used.</span>
                    <button
                      type="button"
                      onClick={() => setRemoveCover(false)}
                      className="text-xs font-semibold text-white underline hover:no-underline ml-2 shrink-0"
                    >
                      Undo
                    </button>
                  </div>
                )}

                {/* Upload New Cover */}
                <div>
                  <p className="text-[11px] text-slate-400 mb-1.5 font-medium">
                    {editingBook.cover_path && !removeCover ? 'Upload new cover to replace:' : 'Add a cover image:'}
                  </p>
                  <input
                    ref={editCoverInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      setEditCoverFile(e.target.files?.[0] || null)
                      setRemoveCover(false)
                    }}
                    className="block w-full text-xs text-slate-400 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-pink-900/50 file:text-pink-300 hover:file:bg-pink-800/60 cursor-pointer"
                  />
                  {editCoverFile && (
                    <div className="flex items-center justify-between mt-2 p-2 rounded-lg bg-pink-950/40 border border-pink-500/30 text-xs text-pink-300">
                      <span className="truncate">
                        New Cover: <strong>{editCoverFile.name}</strong>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setEditCoverFile(null)
                          if (editCoverInputRef.current) editCoverInputRef.current.value = ''
                        }}
                        className="text-slate-400 hover:text-white ml-2 shrink-0 p-0.5"
                        title="Cancel new cover"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingBook(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingBook}
                  className="px-6 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-md shadow-purple-600/30 flex items-center gap-1.5 disabled:opacity-50 transition-all hover:scale-[1.01]"
                >
                  {updatingBook ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                  <span>{updatingBook ? 'Saving Changes...' : 'Update Storybook'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal Popup */}
      {bookToDelete && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="glass-panel p-6 sm:p-7 rounded-2xl w-full max-w-md shadow-2xl relative border border-rose-500/30">
            {/* Close X Button */}
            <button
              onClick={() => setBookToDelete(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header Icon & Title */}
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="pt-0.5">
                <h3 className="text-lg font-bold text-white">Delete Storybook?</h3>
                <p className="text-xs text-slate-400 mt-1">This action cannot be undone.</p>
              </div>
            </div>

            {/* Message Body */}
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-sm text-slate-300 mb-6">
              <p>
                Are you sure you want to delete <strong className="text-white font-semibold">&ldquo;{bookToDelete.title}&rdquo;</strong>?
              </p>
              <p className="text-xs text-rose-300/80 mt-2">
                This will permanently remove the storybook and delete its PDF and cover thumbnail from storage.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setBookToDelete(null)}
                disabled={deletingId === bookToDelete.id}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deletingId === bookToDelete.id}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 shadow-md shadow-rose-600/30 flex items-center gap-1.5 disabled:opacity-50 transition-all hover:scale-[1.01]"
              >
                {deletingId === bookToDelete.id ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Storybook</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
