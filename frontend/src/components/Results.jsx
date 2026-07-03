import { useState } from 'react'
import { getInitials, scoreTextColor, assessmentBadgeClasses } from '../lib/score'

function FormattedText({ text }) {
  if (!text) return null

  return (
    <div className="text-gray-300 whitespace-pre-wrap leading-relaxed">
      {text.split('\n').map((line, i) => (
        <div key={i}>{renderInline(line)}</div>
      ))}
    </div>
  )
}

function renderInline(line) {
  const parts = line.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={i} className="text-white font-semibold">{part.slice(2, -2)}</strong>
      : <span key={i}>{part}</span>
  )
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className="text-sm bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded transition-colors"
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  )
}

function TagList({ items, tone }) {
  if (!items || items.length === 0) return <p className="text-sm text-gray-500">None</p>
  const toneClasses = tone === 'good'
    ? 'bg-emerald-950/50 text-emerald-300 border-emerald-800'
    : 'bg-amber-950/50 text-amber-300 border-amber-800'
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item, i) => (
        <span key={i} className={`text-xs px-2 py-0.5 rounded-full border ${toneClasses}`}>{item}</span>
      ))}
    </div>
  )
}

function MatchAnalysis({ data }) {
  if (!data) return null
  const { score = 0, assessment, matches = [], missing = [], advice = [] } = data

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <span className={`text-3xl font-bold ${scoreTextColor(score)}`}>{score}%</span>
        <span className={`text-xs px-2 py-1 rounded-full border capitalize ${assessmentBadgeClasses(assessment)}`}>
          {assessment} chance
        </span>
      </div>

      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-400 mb-2">Matches</h3>
        <TagList items={matches} tone="good" />
      </div>

      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-400 mb-2">Missing</h3>
        <TagList items={missing} tone="warn" />
      </div>

      {advice.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-400 mb-2">Advice</h3>
          <ul className="list-disc list-inside space-y-1 text-gray-300 text-sm">
            {advice.map((tip, i) => <li key={i}>{tip}</li>)}
          </ul>
        </div>
      )}
    </div>
  )
}

function Results({ result, jobUrl, onBack }) {
  return (
    <div className="mt-10 space-y-6">

      {onBack && (
        <button
          onClick={onBack}
          className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-1"
        >
          ← Back to results
        </button>
      )}

      {/* Company */}
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
        <div className="flex items-center gap-3">
          <div className="shrink-0 w-12 h-12 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center font-semibold text-gray-300">
            {getInitials(result.company_name)}
          </div>
          <div>
            <p className="text-2xl font-bold">{result.job_title}</p>
            <p className="text-gray-400">
              {result.company_name}{result.location ? ` · ${result.location}` : ''}
            </p>
          </div>
        </div>
        {jobUrl && (
          <a
            href={jobUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-3 text-sm text-blue-400 hover:text-blue-300"
          >
            View original posting ↗
          </a>
        )}
      </div>

      {/* Match analysis */}
      {result.analyze_match && (
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Match Analysis</h2>
          <MatchAnalysis data={result.analyze_match} />
        </div>
      )}

      {/* Cover Letter */}
      {result.generate_cover_letter && (
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Cover Letter</h2>
            <CopyButton text={result.generate_cover_letter.cover_letter} />
          </div>
          <FormattedText text={result.generate_cover_letter.cover_letter} />
        </div>
      )}

      {/* Company profile */}
      {result.research_company && (
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Company Profile</h2>
          <FormattedText text={result.research_company.company_profile} />
        </div>
      )}

      {/* Agent summary */}
      {result.summary && (
        <div className="bg-gray-900 border border-blue-700 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Agent Summary</h2>
          <FormattedText text={result.summary} />
        </div>
      )}

    </div>
  )
}

export default Results
