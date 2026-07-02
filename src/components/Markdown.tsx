import { useMemo } from 'react'
import { marked } from 'marked'
import { openGlobalSearch } from '../utils/globalSearch'

marked.use({ breaks: true, gfm: true })

const escapeAttr = (s: string) => s.replace(/"/g, '&quot;')

// Rendu Markdown local : le contenu vient toujours du MJ (notes, documents),
// pas d'une source externe. La syntaxe [[Nom]] devient un lien qui ouvre la
// recherche globale sur ce nom.
export default function Markdown({ content, className }: { content: string; className?: string }) {
  const html = useMemo(() => {
    const withLinks = content.replace(
      /\[\[([^\]]+)\]\]/g,
      (_, name: string) => `<a class="wikilink" data-wikilink="${escapeAttr(name)}">${name}</a>`
    )
    return marked.parse(withLinks, { async: false })
  }, [content])

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const link = (e.target as HTMLElement).closest('[data-wikilink]')
    if (link) {
      e.preventDefault()
      openGlobalSearch(link.getAttribute('data-wikilink') ?? '')
    }
  }

  return (
    <div className={`md ${className ?? ''}`} onClick={handleClick} dangerouslySetInnerHTML={{ __html: html }} />
  )
}
