// A local recruitment synonym mapping
const SYNONYM_MAP: Record<string, string[]> = {
  'backend': ['backend', 'back-end', 'python', 'node', 'go', 'golang', 'java', 'springboot', 'django', 'fastapi'],
  'frontend': ['frontend', 'front-end', 'react', 'angular', 'vue', 'nextjs', 'javascript', 'typescript', 'css', 'html'],
  'fullstack': ['fullstack', 'full-stack', 'react', 'node', 'express', 'nextjs', 'typescript'],
  'cloud': ['cloud', 'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'devops', 'terraform'],
  'devops': ['devops', 'ci/cd', 'docker', 'kubernetes', 'jenkins', 'ansible', 'terraform', 'aws'],
  'senior': ['senior', 'sr', 'lead', 'principal', 'architect'],
  'junior': ['junior', 'jr', 'entry-level', 'associate'],
  'mobile': ['mobile', 'ios', 'android', 'flutter', 'react-native', 'swift', 'kotlin'],
  'database': ['database', 'db', 'postgres', 'postgresql', 'mysql', 'mongodb', 'redis', 'sql', 'nosql', 'supabase'],
  'data': ['data', 'python', 'pandas', 'numpy', 'spark', 'hadoop', 'machine-learning', 'ml', 'ai', 'sql'],
  'security': ['security', 'cybersecurity', 'pentest', 'owasp', 'firewall', 'ssl', 'oauth'],
}

// Stop words to filter out of the natural query
const STOP_WORDS = new Set([
  'show', 'me', 'find', 'search', 'get', 'list', 'who', 'have', 'has', 'worked',
  'with', 'in', 'on', 'at', 'for', 'of', 'and', 'or', 'the', 'a', 'an', 'some',
  'any', 'candidate', 'candidates', 'resume', 'resumes', 'cv', 'cvs', 'engineer',
  'engineers', 'developer', 'developers', 'programmer', 'programmers', 'specialist',
  'specialists', 'professional', 'professionals', 'experienced'
])

export function buildFtsQuery(queryText: string): string {
  if (!queryText || !queryText.trim()) return ''

  // Split query into lowercase alphanumeric words
  const words = queryText
    .toLowerCase()
    .replace(/[^a-z0-9+#-]/g, ' ') // Preserve # (C#) and + (C++) and - (front-end)
    .split(/\s+/)
    .filter(w => w.length > 0 && !STOP_WORDS.has(w))

  if (words.length === 0) {
    // If all words were stop words, fallback to the original words
    const fallbackWords = queryText
      .toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 0)
    
    if (fallbackWords.length === 0) return ''
    return fallbackWords.join(' & ')
  }

  // Map each word to its synonym TSQuery group
  const queryGroups = words.map(word => {
    // Check if we have synonyms for this word
    const synonyms = SYNONYM_MAP[word]
    if (synonyms && synonyms.length > 0) {
      // Return a group: '(word | syn1 | syn2 | ...)'
      // Note: We use double quotes for phrases with hyphens/spaces to be safe
      const groupTerms = synonyms.map(s => s.includes(' ') || s.includes('-') ? `'${s}'` : s)
      return `(${groupTerms.join(' | ')})`
    }
    
    // Fallback: single word
    return word.includes(' ') || word.includes('-') ? `'${word}'` : word
  })

  // Join groups with '&' for a standard AND search across the concept groups
  return queryGroups.join(' & ')
}

export interface RelevancyCV {
  name?: string
  experience?: string
  education?: string
  rawText?: string
  skills?: string[]
}

export function computeRelevancy(cv: RelevancyCV, queryText: string): number {
  if (!queryText || !queryText.trim()) return 0

  const words = queryText
    .toLowerCase()
    .replace(/[^a-z0-9+#-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 0 && !STOP_WORDS.has(w))

  if (words.length === 0) return 0

  // Combine all fields into a single search content string
  const skillsStr = Array.isArray(cv.skills) ? cv.skills.join(' ') : ''
  const content = `${cv.name} ${cv.experience} ${cv.education} ${cv.rawText} ${skillsStr}`.toLowerCase()

  let matchedConcepts = 0

  for (const word of words) {
    const synonyms = SYNONYM_MAP[word] || []
    const terms = [word, ...synonyms]

    const hasMatch = terms.some(term => content.includes(term.toLowerCase()))

    if (hasMatch) {
      matchedConcepts++
    }
  }

  // Scale score between 65% and 98%
  const ratio = matchedConcepts / words.length
  return 65 + Math.round(ratio * 33)
}
