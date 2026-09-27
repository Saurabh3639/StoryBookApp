import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { PDFDocument } from 'pdf-lib'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
) {
  try {
    const { bookId } = await params
    const supabase = await createClient()

    // 1. Verify admin role
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 2. Get book record to know pdf_path & cover_path
    const { data: book, error: fetchErr } = await supabase
      .from('books')
      .select('pdf_path, cover_path')
      .eq('id', bookId)
      .single()

    if (fetchErr || !book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 })
    }

    const adminSupabase = createAdminClient()

    // 3. Remove PDF from 'storybooks' storage bucket
    if (book.pdf_path) {
      await adminSupabase.storage.from('storybooks').remove([book.pdf_path])
    }

    // 4. Remove Cover thumbnail from 'covers' storage bucket if exists
    if (book.cover_path) {
      await adminSupabase.storage.from('covers').remove([book.cover_path])
    }

    // 5. Delete DB record
    const { error: deleteErr } = await supabase
      .from('books')
      .delete()
      .eq('id', bookId)

    if (deleteErr) {
      return NextResponse.json({ error: deleteErr.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
) {
  try {
    const { bookId } = await params
    const supabase = await createClient()

    // 1. Verify admin role
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 2. Fetch existing book record
    const { data: existingBook, error: fetchErr } = await supabase
      .from('books')
      .select('*')
      .eq('id', bookId)
      .single()

    if (fetchErr || !existingBook) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 })
    }

    const adminSupabase = createAdminClient()
    const updatePayload: Record<string, any> = {}

    const contentType = request.headers.get('content-type') || ''
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      const title = formData.get('title') as string
      const description = formData.get('description') as string
      const categoryId = formData.get('categoryId') as string
      const newPdfFile = formData.get('pdfFile') as File | null
      const newCoverFile = formData.get('coverFile') as File | null
      const removeCover = formData.get('removeCover') === 'true'

      if (title) updatePayload.title = title
      if (description) updatePayload.description = description
      if (categoryId) updatePayload.category_id = categoryId

      // If new PDF provided, replace old PDF
      if (newPdfFile && newPdfFile.size > 0) {
        const pdfArrayBuffer = await newPdfFile.arrayBuffer()
        let pageCount = 1
        try {
          const pdfDoc = await PDFDocument.load(pdfArrayBuffer, { ignoreEncryption: true })
          pageCount = pdfDoc.getPageCount()
        } catch (err) {
          console.warn('pdf-lib count fallback in edit:', err)
        }

        const safePdfName = newPdfFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')

        const { error: pdfUploadErr } = await adminSupabase.storage
          .from('storybooks')
          .upload(safePdfName, Buffer.from(pdfArrayBuffer), {
            contentType: newPdfFile.type || 'application/pdf',
            upsert: true,
          })

        if (pdfUploadErr) {
          return NextResponse.json({ error: `New PDF upload failed: ${pdfUploadErr.message}` }, { status: 500 })
        }

        // Delete old PDF from storage if filename changed
        if (existingBook.pdf_path && existingBook.pdf_path !== safePdfName) {
          await adminSupabase.storage.from('storybooks').remove([existingBook.pdf_path])
        }

        updatePayload.pdf_path = safePdfName
        updatePayload.page_count = pageCount
      }

      // If new Cover provided, upload and replace old cover
      if (newCoverFile && newCoverFile.size > 0) {
        const coverArrayBuffer = await newCoverFile.arrayBuffer()
        const safeCoverName = newCoverFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')

        const { error: coverUploadErr } = await adminSupabase.storage
          .from('covers')
          .upload(safeCoverName, Buffer.from(coverArrayBuffer), {
            contentType: newCoverFile.type || 'image/jpeg',
            upsert: true,
          })

        if (coverUploadErr) {
          return NextResponse.json({ error: `New cover upload failed: ${coverUploadErr.message}` }, { status: 500 })
        }

        // Delete old cover from storage if filename changed
        if (existingBook.cover_path && existingBook.cover_path !== safeCoverName) {
          await adminSupabase.storage.from('covers').remove([existingBook.cover_path])
        }

        updatePayload.cover_path = safeCoverName
      } else if (removeCover) {
        // User requested removing current cover thumbnail
        if (existingBook.cover_path) {
          await adminSupabase.storage.from('covers').remove([existingBook.cover_path])
        }
        updatePayload.cover_path = null
      }
    } else {
      // JSON body fallback
      const body = await request.json()
      if (body.title) updatePayload.title = body.title
      if (body.description) updatePayload.description = body.description
      if (body.category_id) updatePayload.category_id = body.category_id
      if (body.removeCover) {
        if (existingBook.cover_path) {
          await adminSupabase.storage.from('covers').remove([existingBook.cover_path])
        }
        updatePayload.cover_path = null
      }
    }

    // 3. Update database record
    const { data: updatedBook, error: updateErr } = await supabase
      .from('books')
      .update(updatePayload)
      .eq('id', bookId)
      .select('*, categories(id, name, slug)')
      .single()

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, book: updatedBook })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
