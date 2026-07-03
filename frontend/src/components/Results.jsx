import { useState } from 'react'

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

function Results({ result }) {
  return (
    <div className="mt-10 space-y-6">

      {/* Company */}
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-400 mb-1">Company</h2>
        <p className="text-2xl font-bold">{result.extract_company_name}</p>
      </div>

      {/* Match analysis */}
      {result.analyze_match && (
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Match Analysis</h2>
          <FormattedText text={result.analyze_match.analysis} />
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
