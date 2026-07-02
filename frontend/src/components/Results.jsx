function Results({ result }) {
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    alert('Kopirano!')
  }

  return (
    <div className="mt-10 space-y-6">
      
      {/* Match Score */}
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-400 mb-1">Kompanija</h2>
        <p className="text-2xl font-bold">{result.company_name}</p>
      </div>

      {/* Analiza */}
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Analiza poklapanja</h2>
        <p className="text-gray-300 whitespace-pre-wrap">{result.match.analysis}</p>
      </div>

      {/* Cover Letter */}
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Cover Letter</h2>
          <button
            onClick={() => copyToClipboard(result.cover_letter.cover_letter)}
            className="text-sm bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded transition-colors"
          >
            Kopiraj
          </button>
        </div>
        <p className="text-gray-300 whitespace-pre-wrap">{result.cover_letter.cover_letter}</p>
      </div>

      {/* Company Profil */}
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Profil kompanije</h2>
        <p className="text-gray-300 whitespace-pre-wrap">{result.company.company_profile}</p>
      </div>

    </div>
  )
}

export default Results