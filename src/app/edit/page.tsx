'use client'
import React, { useState, useEffect } from 'react'
import Link from 'next/link'

type Row = { source: string; target: string; value: string }

const parseCSV = (csv: string): Row[] =>
    csv
        .trim()
        .split('\n')
        .filter(Boolean)
        .map(line => {
          const [source = '', target = '', value = ''] = line.split(',')
          return { source: source.trim(), target: target.trim(), value: value.trim() }
        })

const toCSV = (rows: Row[]): string =>
    rows
        .map(r => `${r.source},${r.target},${r.value}`)
        .join('\n')

const EditCSV: React.FC = () => {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  useEffect(() => {
    const loadCSV = async () => {
      try {
        setLoading(true)
        const res = await fetch('/data/relationships.csv')
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const text = await res.text()
        setRows(parseCSV(text))
        setError(null)
      } catch (err: any) {
        setError(`Failed to load CSV: ${err.message}`)
      } finally {
        setLoading(false)
      }
    }
    loadCSV()
  }, [])

  const handleCellChange = (idx: number, key: keyof Row, value: string) => {
    setRows(rows =>
        rows.map((row, i) => (i === idx ? { ...row, [key]: value } : row))
    )
  }

  const handleAddRow = () => {
    setRows([...rows, { source: '', target: '', value: '' }])
  }

  const handleRemoveRow = (idx: number) => {
    setRows(rows => rows.filter((_, i) => i !== idx))
  }

  const handleSave = async () => {
    try {
      // Validate
      for (const [i, row] of rows.entries()) {
        if (!row.source || !row.target || row.value === '') {
          throw new Error(`Row ${i + 1} is incomplete`)
        }
        if (isNaN(Number(row.value))) {
          throw new Error(`Value must be a number in row ${i + 1}`)
        }
      }
      const csvContent = toCSV(rows)
      const response = await fetch('/api/save-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: csvContent,
      })
      if (!response.ok) throw new Error(`Server error: ${response.status}`)
      downloadCSV(csvContent)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err: any) {
      setError(err.message)
    }
  }

  const downloadCSV = (content: string) => {
    const blob = new Blob([content], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'relationships.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Edit CSV Data</h1>
          <Link href="/" className="text-blue-500 hover:underline">
            Back to Visualization
          </Link>
        </div>
        {loading ? (
            <div className="text-center py-10">Loading CSV data...</div>
        ) : error ? (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
        ) : (
            <>
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  Edit the table below. Each row: <b>source, target, value</b>
                </p>
                <div className="overflow-x-auto">
                  <table className="min-w-full border rounded bg-white shadow">
                    <thead>
                    <tr className="bg-gray-100">
                      <th className="p-2 border">Source</th>
                      <th className="p-2 border">Target</th>
                      <th className="p-2 border">Value</th>
                      <th className="p-2 border"></th>
                    </tr>
                    </thead>
                    <tbody>
                    {rows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="p-2 border">
                            <input
                                className="w-full px-2 py-1 border rounded"
                                value={row.source}
                                onChange={e => handleCellChange(idx, 'source', e.target.value)}
                            />
                          </td>
                          <td className="p-2 border">
                            <input
                                className="w-full px-2 py-1 border rounded"
                                value={row.target}
                                onChange={e => handleCellChange(idx, 'target', e.target.value)}
                            />
                          </td>
                          <td className="p-2 border">
                            <input
                                className="w-full px-2 py-1 border rounded"
                                value={row.value}
                                onChange={e => handleCellChange(idx, 'value', e.target.value)}
                                type="number"
                            />
                          </td>
                          <td className="p-2 border text-center">
                            <button
                                className="text-red-500 hover:text-red-700"
                                onClick={() => handleRemoveRow(idx)}
                                title="Remove row"
                            >
                              &#10005;
                            </button>
                          </td>
                        </tr>
                    ))}
                    </tbody>
                  </table>
                </div>
                <button
                    className="mt-3 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
                    onClick={handleAddRow}
                >
                  + Add Row
                </button>
              </div>
              {saveSuccess && (
                  <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
                    CSV saved successfully and downloaded!
                  </div>
              )}
              <div className="flex justify-end">
                <button
                    onClick={handleSave}
                    className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
                >
                  Save & Download
                </button>
              </div>
            </>
        )}
      </div>
  )
}

export default EditCSV
