export const MAX_JOBS = 5

function JobUrlList({ urls, onChange }) {
  const updateUrl = (index, value) => {
    const next = [...urls]
    next[index] = value
    onChange(next)
  }

  const addUrl = () => onChange([...urls, ''])

  const removeUrl = (index) => {
    if (urls.length === 1) {
      onChange([''])
      return
    }
    onChange(urls.filter((_, i) => i !== index))
  }

  return (
    <div className="mb-6">
      <label className="block text-sm font-medium mb-2">Job posting URLs</label>
      <div className="space-y-2">
        {urls.map((url, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="shrink-0 w-7 h-7 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-xs text-gray-400">
              {i + 1}
            </span>
            <input
              type="text"
              value={url}
              onChange={(e) => updateUrl(i, e.target.value)}
              placeholder="https://example.com/jobs/..."
              className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
            <button
              type="button"
              onClick={() => removeUrl(i)}
              aria-label="Remove job URL"
              className="shrink-0 w-9 h-9 rounded-lg border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 flex items-center justify-center transition-colors"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {urls.length < MAX_JOBS && (
        <button
          type="button"
          onClick={addUrl}
          className="mt-2 w-full border border-dashed border-gray-700 rounded-lg py-2 text-sm text-gray-400 hover:text-white hover:border-gray-500 transition-colors"
        >
          + Add job
        </button>
      )}
    </div>
  )
}

export default JobUrlList
