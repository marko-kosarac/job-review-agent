import { useState } from 'react'
import axios from 'axios'
import Results from '../components/Results'

function HomePage() {
  const [jobUrl, setJobUrl] = useState('')
  const [cvText, setCvText] = useState('')
  const [cvFile, setCvFile] = useState(null)
  const [cvMode, setCvMode] = useState('text') // 'text' ili 'pdf'
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)

  const handleAnalyze = async () => {
    setLoading(true)
    try {
      let response

      if (cvMode === 'pdf' && cvFile) {
        // Slanje kao FormData za PDF
        const formData = new FormData()
        formData.append('file', cvFile)
        
        // Prvo uploaduj PDF i dobij tekst
        const pdfResponse = await axios.post('http://localhost:8000/test-pdf', formData)
        const extractedText = pdfResponse.data.text

        // Zatim analiziraj
        response = await axios.post(
          `http://localhost:8000/analyze?job_url=${encodeURIComponent(jobUrl)}&cv_text=${encodeURIComponent(extractedText)}`
        )
      } else {
        response = await axios.post(
          `http://localhost:8000/analyze?job_url=${encodeURIComponent(jobUrl)}&cv_text=${encodeURIComponent(cvText)}`
        )
      }

      setResult(response.data)
    } catch (error) {
      console.error(error)
      alert('Greška pri analizi!')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-2xl mx-auto py-16 px-4">
        
        <h1 className="text-4xl font-bold mb-2">JobReview</h1>
        <p className="text-gray-400 mb-10">Unesi oglas i CV — AI analizira poklapanje</p>

        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">URL oglasa</label>
          <input
            type="text"
            value={jobUrl}
            onChange={(e) => setJobUrl(e.target.value)}
            placeholder="https://helloworld.rs/..."
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* CV mod switcher */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setCvMode('text')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              cvMode === 'text' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            Unesi tekst
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
            <label className="block text-sm font-medium mb-2">Tekst CV-a</label>
            <textarea
              value={cvText}
              onChange={(e) => setCvText(e.target.value)}
              placeholder="Nalijepi tekst svog CV-a ovdje..."
              rows={10}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>
        ) : (
          <div className="mb-8">
            <label className="block text-sm font-medium mb-2">PDF CV</label>
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => setCvFile(e.target.files[0])}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-gray-300 file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:bg-blue-600 file:text-white file:cursor-pointer"
            />
            {cvFile && (
              <p className="text-sm text-gray-400 mt-2">Odabran: {cvFile.name}</p>
            )}
          </div>
        )}

        <button
          onClick={handleAnalyze}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors"
        >
          {loading ? 'Analiziranje...' : 'Analiziraj'}
        </button>

        {result && <Results result={result} />}

      </div>
    </div>
  )
}

export default HomePage