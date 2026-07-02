import { useState } from 'react'
import axios from 'axios'

function HomePage() {
  const [jobUrl, setJobUrl] = useState('')
  const [cvText, setCvText] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)

  const handleAnalyze = async () => {
    setLoading(true)
    try {
      const response = await axios.post(
        `http://localhost:8000/analyze?job_url=${encodeURIComponent(jobUrl)}&cv_text=${encodeURIComponent(cvText)}`
      )
      setResult(response.data)
    } catch (error) {
      console.error(error)
      alert('Greška pri analizi!')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: '600px', margin: '40px auto', padding: '20px' }}>
      <h1>JobReview</h1>
      <p>Unesi oglas i CV, AI će analizirati poklapanje</p>

      <div style={{ marginBottom: '20px' }}>
        <label>URL oglasa</label>
        <input
          type="text"
          value={jobUrl}
          onChange={(e) => setJobUrl(e.target.value)}
          placeholder="https://helloworld.rs/..."
          style={{ display: 'block', width: '100%', padding: '8px', marginTop: '5px' }}
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label>Tekst CV-a</label>
        <textarea
          value={cvText}
          onChange={(e) => setCvText(e.target.value)}
          placeholder="Nalijepi tekst svog CV-a ovdje..."
          rows={10}
          style={{ display: 'block', width: '100%', padding: '8px', marginTop: '5px' }}
        />
      </div>

      <button onClick={handleAnalyze} disabled={loading}>
        {loading ? 'Analiziranje...' : 'Analiziraj'}
      </button>

      {result && (
        <div style={{ marginTop: '30px' }}>
          <h2>Rezultati</h2>
          <pre style={{ whiteSpace: 'pre-wrap' }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}

export default HomePage