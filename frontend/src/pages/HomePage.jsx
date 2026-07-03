import { useState, useRef } from 'react'
import axios from 'axios'
import Results from '../components/Results'
import JobCard from '../components/JobCard'
import JobUrlList from '../components/JobUrlList'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

function sortJobs(jobs, sortBy) {
  const withResults = [...jobs]
  withResults.sort((a, b) => {
    if (sortBy === 'company-asc' || sortBy === 'company-desc') {
      const nameA = (a.result?.company_name || '').toLowerCase()
      const nameB = (b.result?.company_name || '').toLowerCase()
      const cmp = nameA.localeCompare(nameB)
      return sortBy === 'company-asc' ? cmp : -cmp
    }

    const scoreA = a.result?.analyze_match?.score ?? -1
    const scoreB = b.result?.analyze_match?.score ?? -1
    return scoreB - scoreA
  })
  return withResults
}

function HomePage() {
  const [jobUrls, setJobUrls] = useState([''])
  const [cvText, setCvText] = useState('')
  const [cvFile, setCvFile] = useState(null)
  const [cvMode, setCvMode] = useState('text')
  const [language, setLanguage] = useState('en')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [jobs, setJobs] = useState([])
  const [sortBy, setSortBy] = useState('score')
  const [selectedUrl, setSelectedUrl] = useState(null)
  const [view, setView] = useState('form') 

  const abortRef = useRef(null)
  const fileInputRef = useRef(null)

  const clearCvText = () => setCvText('')

  const clearCvFile = () => {
    setCvFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const updateJob = (url, patch) => {
    setJobs(prev => prev.map(j => (j.url === url ? { ...j, ...patch } : j)))
  }

  const handleAnalyze = async () => {
    const urls = [...new Set(jobUrls.map(u => u.trim()).filter(Boolean))]
    if (urls.length === 0) {
      setError('Enter at least one job posting URL.')
      return
    }
    if (cvMode === 'text' && !cvText.trim()) {
      setError('Enter your CV text.')
      return
    }
    if (cvMode === 'pdf' && !cvFile) {
      setError('Upload your CV as a PDF.')
      return
    }

    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setError('')
    setLoading(true)
    setSelectedUrl(null)
    setJobs(urls.map(url => ({ url, status: 'loading', statusMessage: '', result: null, error: null })))
    setView('results')

    try {
      let finalCvText = cvText

      if (cvMode === 'pdf' && cvFile) {
        const formData = new FormData()
        formData.append('file', cvFile)
        const pdfResponse = await axios.post(`${API_URL}/test-pdf`, formData, { signal: controller.signal })
        finalCvText = pdfResponse.data.text
      }

      const response = await fetch(`${API_URL}/agent-stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cv_text: finalCvText, job_urls: urls, language }),
        signal: controller.signal,
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
          if (!data.job_url) continue

          if (data.status === 'progress') {
            updateJob(data.job_url, { statusMessage: data.message })
          } else if (data.status === 'done') {
            updateJob(data.job_url, { status: 'done', result: data.result, statusMessage: '' })
          } else if (data.status === 'error') {
            updateJob(data.job_url, { status: 'error', error: data.message, statusMessage: '' })
          }
        }
      }
    } catch (err) {
      if (err.name === 'AbortError' || err.code === 'ERR_CANCELED') return
      console.error(err)
      setError(err.message || 'An error occurred during analysis.')
    } finally {
      setLoading(false)
    }
  }

  const handleNewSearch = () => {
    if (abortRef.current) abortRef.current.abort()
    setLoading(false)
    setView('form')
    setSelectedUrl(null)
    setJobs([])
    setError('')
  }

  const selectedJob = jobs.find(j => j.url === selectedUrl)
  const sortedJobs = sortJobs(jobs, sortBy)

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-2xl mx-auto py-16 px-4">

        <h1 className="text-4xl font-bold mb-2">JobReview</h1>
        <p className="text-gray-400 mb-10">Enter job postings and your CV — AI analyzes the match</p>

        {error && (
          <div className="mb-6 bg-red-950/40 border border-red-800 rounded-lg p-4">
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {view === 'form' ? (
          <>
            <JobUrlList urls={jobUrls} onChange={setJobUrls} />

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
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium">CV text</label>
                  {cvText && (
                    <button
                      type="button"
                      onClick={clearCvText}
                      className="text-xs text-gray-400 hover:text-white transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </div>
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
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setCvFile(e.target.files[0])}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-gray-300 file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:bg-blue-600 file:text-white file:cursor-pointer"
                />
                {cvFile && (
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-sm text-gray-400">Selected: {cvFile.name}</p>
                    <button
                      type="button"
                      onClick={clearCvFile}
                      className="text-xs text-gray-400 hover:text-white transition-colors"
                    >
                      Remove
                    </button>
                  </div>
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
          </>
        ) : (
          <>
            <button
              onClick={handleNewSearch}
              className="mb-6 text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-1"
            >
              ← New search
            </button>

            {selectedJob ? (
              <Results
                result={selectedJob.result}
                jobUrl={selectedJob.url}
                onBack={() => setSelectedUrl(null)}
              />
            ) : (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Results</h2>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-300 focus:outline-none focus:border-blue-500"
                  >
                    <option value="score">Sort: Match score</option>
                    <option value="company-asc">Sort: Company A-Z</option>
                    <option value="company-desc">Sort: Company Z-A</option>
                  </select>
                </div>
                <div className="space-y-3">
                  {sortedJobs.map(job => (
                    <JobCard
                      key={job.url}
                      job={job}
                      onClick={() => job.status === 'done' && setSelectedUrl(job.url)}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  )
}

export default HomePage
