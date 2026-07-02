// Ouvre la palette de recherche globale sur un terme — GMView écoute cet
// événement (déclenché par les [[wikilinks]] notamment).
export const openGlobalSearch = (query: string) =>
  window.dispatchEvent(new CustomEvent('aberkaer:search', { detail: query }))
