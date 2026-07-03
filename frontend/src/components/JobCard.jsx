import { getInitials, scoreTextColor, scoreBarColor } from '../lib/score'

function JobCard({ job, onClick }) {
  const { url, status, statusMessage, result, error } = job

  if (status === 'error') {
    return (
      <div className="bg-red-950/30 border border-red-800 rounded-lg p-5">
        <p className="text-sm text-gray-500 truncate mb-1">{url}</p>
        <p className="text-red-300 text-sm">{error}</p>
      </div>
    )
  }

  if (status !== 'done' || !result) {
    return (
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-5 flex items-center gap-3">
        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin shrink-0"></div>
        <div className="min-w-0">
          <p className="text-sm text-gray-500 truncate">{url}</p>
          <p className="text-gray-300 text-sm">{statusMessage || 'Starting...'}</p>
        </div>
      </div>
    )
  }

  const { company_name, job_title, location, analyze_match } = result
  const score = analyze_match?.score ?? 0
  const matches = analyze_match?.matches ?? []
  const missing = analyze_match?.missing ?? []

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left bg-gray-900 border border-gray-700 hover:border-blue-600 rounded-lg p-5 transition-colors"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="shrink-0 w-10 h-10 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center text-sm font-semibold text-gray-300">
            {getInitials(company_name)}
          </div>
          <div className="min-w-0">
            <p className="font-semibold truncate">{job_title}</p>
            <p className="text-sm text-gray-400 truncate">
              {company_name}{location ? ` · ${location}` : ''}
            </p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className={`text-xl font-bold ${scoreTextColor(score)}`}>{score}%</p>
          <div className="w-16 h-1.5 bg-gray-800 rounded-full mt-1 overflow-hidden">
            <div className={`h-full ${scoreBarColor(score)}`} style={{ width: `${score}%` }}></div>
          </div>
        </div>
      </div>

      {(matches.length > 0 || missing.length > 0) && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {matches.slice(0, 4).map((tag, i) => (
            <span key={`m-${i}`} className="text-xs px-2 py-0.5 rounded-full bg-emerald-950/50 text-emerald-300 border border-emerald-800">
              {tag}
            </span>
          ))}
          {missing.slice(0, 2).map((tag, i) => (
            <span key={`x-${i}`} className="text-xs px-2 py-0.5 rounded-full bg-amber-950/50 text-amber-300 border border-amber-800">
              {tag}
            </span>
          ))}
        </div>
      )}
    </button>
  )
}

export default JobCard
