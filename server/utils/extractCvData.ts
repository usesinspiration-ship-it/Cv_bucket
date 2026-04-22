interface ExtractedCvData {
  name: string
  email: string
  phone: string
  skills: string[]
  experience: string
  education: string
  rawText: string
  salary: string
  location: string
}

const commonSkills = [
  'React',
  'TypeScript',
  'JavaScript',
  'Node.js',
  'Express',
  'Next.js',
  'Vue',
  'Angular',
  'Tailwind CSS',
  'Firebase',
  'PostgreSQL',
  'MongoDB',
  'MySQL',
  'GraphQL',
  'REST API',
  'AWS',
  'Cloudflare',
  'Docker',
  'Kubernetes',
  'Python',
  'Django',
  'Java',
  'Spring Boot',
  'C#',
  '.NET',
  'PHP',
  'Laravel',
  'Figma',
  'UI/UX',
  'Product Management',
  'Machine Learning',
  'Data Analysis',
  'Git',
  'CI/CD',
]

const sectionTitles = {
  experience: [
    'experience',
    'work experience',
    'employment history',
    'professional experience',
    'career history',
  ],
  education: ['education', 'academic background', 'academic history'],
  skills: ['skills', 'technical skills', 'core competencies', 'technologies'],
  stop: [
    'summary',
    'profile',
    'projects',
    'certifications',
    'awards',
    'languages',
    'interests',
    'references',
  ],
}

export function extractCvData(rawText: string): ExtractedCvData {
  const normalizedText = rawText
    .replace(/\r/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  const lines = normalizedText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  const email = normalizedText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? ''
  const phone =
    normalizedText.match(/(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?)\d{3}[\s.-]?\d{4}/)?.[0] ??
    ''

  const experience = extractSection(normalizedText, sectionTitles.experience)
  const education = extractSection(normalizedText, sectionTitles.education)
  const skillsSection = extractSection(normalizedText, sectionTitles.skills)

  return {
    name: extractName(lines, email),
    email,
    phone,
    skills: extractSkills(normalizedText, skillsSection),
    experience,
    education,
    rawText: normalizedText,
    salary: extractSalary(normalizedText),
    location: extractLocation(normalizedText, lines),
  }
}

function extractSalary(text: string) {
  // Look for patterns like "Salary: $100k", "CTC: 15 LPA", "Current Salary: £50,000"
  const patterns = [
    /(?:salary|ctc|current salary|compensation)\s*[:|-]?\s*([$€£₹A-Z0-9.,/ ]+)/i,
    /(\d+(?:\.\d+)?\s*(?:LPA|k|USD|GBP|EUR|INR|per annum|per year))/i
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match && match[1]) {
      const val = match[1].trim()
      // Basic validation: length check to avoid capturing paragraphs
      if (val.length > 1 && val.length < 30) return val
    }
  }
  return ''
}

function extractLocation(text: string, lines: string[]) {
  // Look for "Location: City, Country"
  const locationMatch = text.match(/(?:location|address|residence|current city)\s*[:|-]?\s*([A-Z][a-z]+(?:\s*[A-Z][a-z]+)*(?:,\s*[A-Z][a-z]+)*)/i)
  if (locationMatch && locationMatch[1]) {
    return locationMatch[1].trim()
  }

  // Fallback: look for common location patterns near the top of the CV
  // Usually in the first 10 lines, looking for something that looks like "City, Country"
  const topLines = lines.slice(0, 15)
  for (const line of topLines) {
    // Skip lines that are likely just demographics (e.g., "Female, 22 years")
    if (/female|male|years? old|\d+\s*years/i.test(line)) continue
    
    if (line.includes(',') && /^[A-Z]/.test(line) && line.length < 50 && !line.includes('@')) {
      return line
    }
  }

  return ''
}

function extractName(lines: string[], email: string) {
  const firstCandidate = lines.find((line) => {
    const lower = line.toLowerCase()

    return (
      line.length >= 3 &&
      line.length <= 60 &&
      !lower.includes('resume') &&
      !lower.includes('curriculum vitae') &&
      !lower.includes('@') &&
      !/\d{3,}/.test(line)
    )
  })

  if (firstCandidate) {
    return toTitleCase(firstCandidate)
  }

  if (!email) {
    return ''
  }

  return toTitleCase(email.split('@')[0].replace(/[._-]+/g, ' '))
}

function extractSection(text: string, headings: string[]) {
  const lines = text.split('\n')
  const allHeadings = [
    ...sectionTitles.experience,
    ...sectionTitles.education,
    ...sectionTitles.skills,
    ...sectionTitles.stop,
  ]

  let collecting = false
  const collected: string[] = []

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) {
      if (collecting && collected.length > 0) {
        collected.push('')
      }
      continue
    }

    const normalized = line.toLowerCase().replace(/[:|]/g, '')
    const isHeading = allHeadings.includes(normalized)

    if (headings.includes(normalized)) {
      collecting = true
      continue
    }

    if (collecting && isHeading) {
      break
    }

    if (collecting) {
      collected.push(line)
    }
  }

  return collected.join('\n').trim()
}

function extractSkills(text: string, skillsSection: string) {
  const detectedSkills = new Set<string>()
  const lowerText = text.toLowerCase()

  for (const skill of commonSkills) {
    const matcher = new RegExp(`\\b${escapeRegExp(skill.toLowerCase())}\\b`, 'i')
    if (matcher.test(lowerText)) {
      detectedSkills.add(skill)
    }
  }

  if (skillsSection) {
    skillsSection
      .split(/[\n,|•·]/)
      .map((entry) => entry.trim())
      .filter((entry) => entry.length >= 2 && entry.length <= 30)
      .forEach((entry) => detectedSkills.add(toTitleCase(entry)))
  }

  return [...detectedSkills].sort((left, right) => left.localeCompare(right))
}

function toTitleCase(value: string) {
  return value
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(' ')
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
