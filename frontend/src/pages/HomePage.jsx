import { useState } from 'react'
import axios from 'axios'
import Results from '../components/Results'

const API_URL = 'http://localhost:8000'

function HomePage() {
  const [jobUrl, setJobUrl] = useState('')
  const [cvText, setCvText] = useState('')
  const [cvFile, setCvFile] = useState(null)
  const [cvMode, setCvMode] = useState('text')
  const [language, setLanguage] = useState('en')
  const [loading, setLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  const handleAnalyze = async () => {
    setLoading(true)
    setResult(null)
    setError('')
    setStatusMessage('')

    try {
      let finalCvText = cvText

      if (cvMode === 'pdf' && cvFile) {
        const formData = new FormData()
        formData.append('file', cvFile)
        const pdfResponse = await axios.post(`${API_URL}/test-pdf`, formData)
        finalCvText = pdfResponse.data.text
      }

      const response = await fetch(`${API_URL}/agent-stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cv_text: finalCvText, job_url: jobUrl, language }),
      })

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Too many requests in a short time. Please wait a bit and try again.')
        }
        throw new Error('The request failed.')
      }
      if (!response.body) {
        throw new Error('The server does not support a streaming response.')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const events = buffer.split('\n\n')
        buffer = events.pop()

        for (const rawEvent of events) {
          const line = rawEvent.trim()
          if (!line.startsWith('data:')) continue

          const data = JSON.parse(line.slice(5).trim())

          if (data.status === 'progress') {
            setStatusMessage(data.message)
          } else if (data.status === 'done') {
            setResult(data.result)
            setLoading(false)
            setStatusMessage('')
          } else if (data.status === 'error') {
            setError(data.message || 'An error occurred during analysis.')
            setLoading(false)
            setStatusMessage('')
          }
        }
      }
    } catch (err) {
      console.error(err)
      setError(err.message || 'An error occurred during analysis.')
      setLoading(false)
      setStatusMessage('')
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-2xl mx-auto py-16 px-4">

        <h1 className="text-4xl font-bold mb-2">JobReview</h1>
        <p className="text-gray-400 mb-10">Enter a job posting and your CV — AI analyzes the match</p>

        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Job posting URL</label>
          <input
            type="text"
            value={jobUrl}
            onChange={(e) => setJobUrl(e.target.value)}
            placeholder="https://example.com/jobs/..."
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setCvMode('text')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              cvMode === 'text'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            Enter text
          </button>
          <button
            onClick={() => setCvMode('pdf')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              cvMode === 'pdf'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            Upload PDF
          </button>
        </div>

        {cvMode === 'text' ? (
          <div className="mb-8">
            <label className="block text-sm font-medium mb-2">CV text</label>
            <textarea
              value={cvText}
              onChange={(e) => setCvText(e.target.value)}
              placeholder="Paste your CV text here..."
              rows={10}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>
        ) : (
          <div className="mb-8">
            <label className="block text-sm font-medium mb-2">CV PDF</label>
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => setCvFile(e.target.files[0])}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-gray-300 file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:bg-blue-600 file:text-white file:cursor-pointer"
            />
            {cvFile && (
              <p className="text-sm text-gray-400 mt-2">Selected: {cvFile.name}</p>
            )}
          </div>
        )}

        <div className="mb-8">
          <label className="block text-sm font-medium mb-2">Output language</label>
          <div className="flex gap-2">
            <button
              onClick={() => setLanguage('en')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                language === 'en'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              English
            </button>
            <button
              onClick={() => setLanguage('sr')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                language === 'sr'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              Srpski
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">The cover letter is always written in English.</p>
        </div>

        <button
          onClick={handleAnalyze}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors"
        >
          {loading ? 'Analyzing...' : 'Analyze'}
        </button>

        {loading && statusMessage && (
          <div className="mt-6 bg-gray-900 border border-gray-700 rounded-lg p-4 flex items-center gap-3">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-300">{statusMessage}</p>
          </div>
        )}

        {error && (
          <div className="mt-6 bg-red-950/40 border border-red-800 rounded-lg p-4">
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {result && <Results result={result} />}

      </div>
    </div>
  )
}

export default HomePage
