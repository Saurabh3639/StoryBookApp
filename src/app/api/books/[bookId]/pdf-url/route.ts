import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
) {
  try {
    const { bookId } = await params
    const supabase = await createClient()

    // 1. Verify authenticated user session
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Fetch book details from database
    const { data: book, error: dbErr } = await supabase
      .from('books')
      .select('id, title, description, pdf_path, page_count, categories(name)')
      .eq('id', bookId)
      .single()

    if (dbErr || !book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 })
    }

    // 3. Generate short-lived signed URL for private PDF storage (valid for 60 mins)
    const adminSupabase = createAdminClient()
    const { data: signedData, error: signedErr } = await adminSupabase.storage
      .from('storybooks')
      .createSignedUrl(book.pdf_path, 3600)

    if (signedErr || !signedData?.signedUrl) {
      console.error('Signed URL generation error:', signedErr)
      return NextResponse.json({ error: 'Could not generate secure PDF signed access' }, { status: 500 })
    }

    return NextResponse.json({
      signedUrl: signedData.signedUrl,
      title: book.title,
      description: book.description,
      pageCount: book.page_count,
      categoryName: (book.categories as any)?.name || 'Storybook',
    })
  } catch (error: any) {
    console.error('PDF URL route error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
