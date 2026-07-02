import { useMemo } from 'react'
import { marked } from 'marked'

marked.use({ breaks: true, gfm: true })

// Rendu Markdown local : le contenu vient toujours du MJ (notes, documents),
// pas d'une source externe.
export default function Markdown({ content, className }: { content: string; className?: string }) {
  const html = useMemo(() => marked.parse(content, { async: false }), [content])
  return <div className={`md ${className ?? ''}`} dangerouslySetInnerHTML={{ __html: html }} />
}
