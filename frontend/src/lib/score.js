export function getInitials(name) {
  if (!name) return '?'
  const words = name.trim().split(/\s+/)
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()
  const upper = name.replace(/[^A-Za-z]/g, '')
  return (upper.slice(0, 2) || name.slice(0, 2)).toUpperCase()
}

export function scoreTextColor(score) {
  if (score >= 80) return 'text-emerald-400'
  if (score >= 60) return 'text-blue-400'
  return 'text-amber-400'
}

export function scoreBarColor(score) {
  if (score >= 80) return 'bg-emerald-500'
  if (score >= 60) return 'bg-blue-500'
  return 'bg-amber-500'
}

export function assessmentBadgeClasses(assessment) {
  const value = (assessment || '').toLowerCase()
  if (value === 'high') return 'bg-emerald-950/50 text-emerald-300 border-emerald-800'
  if (value === 'medium') return 'bg-amber-950/50 text-amber-300 border-amber-800'
  if (value === 'low') return 'bg-red-950/50 text-red-300 border-red-800'
  return 'bg-gray-800 text-gray-300 border-gray-700'
}
