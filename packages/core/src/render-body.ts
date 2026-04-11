import { generateHTML } from '@tiptap/html'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import TextAlign from '@tiptap/extension-text-align'
import Underline from '@tiptap/extension-underline'

const extensions = [
  StarterKit,
  Link.configure({ openOnClick: false }),
  Image,
  TextAlign.configure({ types: ['heading', 'paragraph'] }),
  Underline,
]

export function renderBody(json: string | null | undefined): string {
  if (!json) return ''
  try {
    const parsed = JSON.parse(json)
    return generateHTML(parsed, extensions)
  } catch {
    return json
  }
}
