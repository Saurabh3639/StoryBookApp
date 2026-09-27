import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { PDFDocument } from 'pdf-lib'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 1. Verify user session & admin role
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin role required' }, { status: 403 })
    }

    // 2. Parse FormData
    const formData = await request.formData()
    const title = formData.get('title') as string
    const description = formData.get('description') as string
    const categoryId = formData.get('categoryId') as string
    const pdfFile = formData.get('pdfFile') as File | null
    const coverFile = formData.get('coverFile') as File | null

    if (!title || !description || !categoryId || !pdfFile) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // 3. Process PDF file server-side to extract page count
    const pdfArrayBuffer = await pdfFile.arrayBuffer()
    let pageCount = 1
    try {
      const pdfDoc = await PDFDocument.load(pdfArrayBuffer, { ignoreEncryption: true })
      pageCount = pdfDoc.getPageCount()
    } catch (err) {
      console.warn('Could not read PDF page count with pdf-lib, fallback to 1:', err)
    }

    const bookId = crypto.randomUUID()
    const safePdfName = pdfFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')

    // Avoid accidental overwrites if a book with the exact same filename exists
    const { data: existingPdf } = await supabase
      .from('books')
      .select('id')
      .eq('pdf_path', safePdfName)
      .maybeSingle()

    let pdfStoragePath = safePdfName
    if (existingPdf) {
      const dotIndex = safePdfName.lastIndexOf('.')
      const ext = dotIndex !== -1 ? safePdfName.substring(dotIndex) : ''
      const base = dotIndex !== -1 ? safePdfName.substring(0, dotIndex) : safePdfName
      pdfStoragePath = `${base}_${Date.now()}${ext}`
    }

    // 4. Upload PDF directly to 'storybooks' bucket using admin client
    const adminSupabase = createAdminClient()

    const { error: pdfUploadErr } = await adminSupabase.storage
      .from('storybooks')
      .upload(pdfStoragePath, Buffer.from(pdfArrayBuffer), {
        contentType: pdfFile.type || 'application/pdf',
        upsert: true,
      })

    if (pdfUploadErr) {
      console.error('PDF upload error:', pdfUploadErr)
      return NextResponse.json({ error: `PDF storage upload failed: ${pdfUploadErr.message}` }, { status: 500 })
    }

    // 5. Upload optional cover file directly to 'covers' bucket
    let coverStoragePath: string | null = null
    if (coverFile && coverFile.size > 0) {
      const coverArrayBuffer = await coverFile.arrayBuffer()
      const safeCoverName = coverFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')

      const { data: existingCover } = await supabase
        .from('books')
        .select('id')
        .eq('cover_path', safeCoverName)
        .maybeSingle()

      let finalCoverPath = safeCoverName
      if (existingCover) {
        const dotIndex = safeCoverName.lastIndexOf('.')
        const ext = dotIndex !== -1 ? safeCoverName.substring(dotIndex) : ''
        const base = dotIndex !== -1 ? safeCoverName.substring(0, dotIndex) : safeCoverName
        finalCoverPath = `${base}_${Date.now()}${ext}`
      }
      coverStoragePath = finalCoverPath

      const { error: coverUploadErr } = await adminSupabase.storage
        .from('covers')
        .upload(coverStoragePath, Buffer.from(coverArrayBuffer), {
          contentType: coverFile.type || 'image/jpeg',
          upsert: true,
        })

      if (coverUploadErr) {
        console.warn('Cover upload warning:', coverUploadErr)
      }
    }

    // 6. Insert book record into database
    const { data: newBook, error: dbErr } = await supabase
      .from('books')
      .insert({
        id: bookId,
        title,
        description,
        category_id: categoryId,
        pdf_path: pdfStoragePath,
        cover_path: coverStoragePath,
        page_count: pageCount,
        created_by: user.id,
      })
      .select('*, categories(id, name, slug)')
      .single()

    if (dbErr) {
      console.error('Book DB insert error:', dbErr)
      return NextResponse.json({ error: `Database error: ${dbErr.message}` }, { status: 500 })
    }

    return NextResponse.json({ success: true, book: newBook }, { status: 201 })
  } catch (error: any) {
    console.error('Upload route error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
