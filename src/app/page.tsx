'use client'
import React, {useEffect, useMemo, useState} from 'react'
import { ChordDiagram, Relationship } from '@/components/diagram'
import RelationshipEditor from '@/components/RelationshipEditor'

const Home: React.FC = () => {
    const [relationships, setRelationships] = useState<Relationship[]>([])
    const [view, setView] = useState<'processen' | 'procesgebieden'>('processen')
    const [showEditor, setShowEditor] = useState(false)

    const parseCSV = (csv: string): Relationship[] => {
        return csv
            .trim()
            .split('\n')
            .filter(line => line.trim())
            .map(line => {
                const [source, target, raw] = line.split(',').map(p => p.trim())
                const value = Number(raw)
                if (!source || !target || isNaN(value)) {
                    throw new Error(`Invalid CSV row: "${line}"`)
                }
                return { source, target, value }
            })
    }

    const loadStaticCsv = async () => {
        try {
            const res = await fetch('/data/relationships.csv')
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            const text = await res.text()
            setRelationships(parseCSV(text))
        } catch (err: any) {
            alert(`Failed to load CSV: ${err.message}`)
        }
    }

    useEffect(() => {
        loadStaticCsv()
    }, [])

    const processen = relationships

    const procesgebieden = useMemo(() =>
        relationships.filter(r => /^[A-Z]\./.test(r.source)), [relationships])

    // Basic dataset validation: ensure non-empty labels and positive numeric values
    const invalidRows = useMemo(() => relationships
        .map((r, i) => ({...r, i}))
        .filter(({source, target, value}) => !source || !target || !Number.isFinite(value) || value <= 0)
    , [relationships])

    const handleFileUpload: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return
        try {
            const text = await file.text()
            const parsed = parseCSV(text)
            setRelationships(parsed)
        } catch (err: any) {
            alert(`Failed to parse CSV: ${err.message}`)
        } finally {
            e.target.value = ''
        }
    }

    const svgToPng = async (svg: SVGSVGElement, filename: string) => {
        const serializer = new XMLSerializer()
        let source = serializer.serializeToString(svg)
        if (!source.match(/^<svg[^>]+xmlns=/)) {
            source = source.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"')
        }
        source = '<?xml version="1.0" standalone="no"?>\r\n' + source
        const svgUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(source)

        const img = new Image()
        const vb = svg.getAttribute('viewBox')?.split(' ').map(Number)
        const width = vb && vb.length === 4 ? vb[2] : svg.clientWidth || 900
        const height = vb && vb.length === 4 ? vb[3] : svg.clientHeight || 600
        const scale = Math.max(1, Math.min(3, Math.ceil(window.devicePixelRatio || 2)))
        const canvas = document.createElement('canvas')
        canvas.width = Math.ceil(width * scale)
        canvas.height = Math.ceil(height * scale)
        const ctx = canvas.getContext('2d')!
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        await new Promise<void>((resolve, reject) => {
            img.onload = () => {
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
                resolve()
            }
            img.onerror = () => reject(new Error('Failed to render SVG to image'))
            img.src = svgUrl
        })

        const blob: Blob = await new Promise((resolve) => canvas.toBlob(b => resolve(b as Blob), 'image/png'))
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        a.remove()
        URL.revokeObjectURL(url)
    }

    const downloadBoth = async () => {
        const ids = ['chart-processen', 'chart-procesgebieden']
        for (const id of ids) {
            const svg = document.getElementById(id) as SVGSVGElement | null
            if (svg) {
                const fname = id === 'chart-processen' ? 'containers_processen.png' : 'containers_procesgebieden.png'
                await svgToPng(svg, fname)
            }
        }
    }

    return (
        <div className="p-4 space-y-4">
            <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex rounded border overflow-hidden">
                    <button
                        className={`px-3 py-1.5 text-sm ${view === 'processen' ? 'bg-blue-600 text-white' : 'bg-white'}`}
                        onClick={() => setView('processen')}
                    >
                        Containers ↔ Processen
                    </button>
                    <button
                        className={`px-3 py-1.5 text-sm ${view === 'procesgebieden' ? 'bg-blue-600 text-white' : 'bg-white'}`}
                        onClick={() => setView('procesgebieden')}
                    >
                        Containers ↔ Procesgebieden
                    </button>
                </div>

                <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
                    <span className="px-2 py-1 bg-gray-100 rounded border">Upload CSV</span>
                    <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleFileUpload} />
                </label>

                <button className="px-3 py-1.5 text-sm border rounded" onClick={loadStaticCsv}>
                    Reset to bundled CSV
                </button>

                <button className="ml-auto px-3 py-1.5 text-sm border rounded" onClick={downloadBoth}>
                    Download both charts (PNG)
                </button>

                <button className="px-3 py-1.5 text-sm border rounded" onClick={() => setShowEditor(s => !s)}>
                    {showEditor ? 'Hide' : 'Show'} editor (drag & drop)
                </button>
            </div>

            <div className="text-sm bg-amber-50 border border-amber-200 text-amber-900 rounded p-3">
                Your data is processed locally in your browser and is never saved on any server. Please download and keep your final CSV and images on your own computer. so that next time you upload the CSV and keep editing from where you left off.
            </div>

            {showEditor && (
                <div className="border rounded p-4">
                    <RelationshipEditor relationships={relationships} setRelationships={setRelationships} />
                </div>
            )}

            <div className="border rounded p-4 relative">
                {relationships.length > 0 ? (
                    invalidRows.length > 0 ? (
                        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
                            <div className="font-medium mb-1">Cannot render diagrams: {invalidRows.length} invalid item(s) detected.</div>
                            <ul className="list-disc pl-5">
                                {invalidRows.slice(0, 5).map(r => (
                                    <li key={r.i}>Row {r.i + 1}: source &#34;{r.source || '—'}&#34;, target &#34;{r.target || '—'}&#34;, value &#34;{String(r.value)}&#34;</li>
                                ))}
                            </ul>
                            {invalidRows.length > 5 && (
                                <div className="mt-1 opacity-70">+ {invalidRows.length - 5} more…</div>
                            )}
                        </div>
                    ) : (
                        <>
                            <div className={view === 'processen' ? '' : 'hidden'}>
                                <ChordDiagram relationships={processen} id="chart-processen" />
                            </div>
                            <div className={view === 'procesgebieden' ? '' : 'hidden'}>
                                <ChordDiagram relationships={procesgebieden} id="chart-procesgebieden" />
                            </div>
                        </>
                    )
                ) : (
                    <p className="text-gray-500 text-center">Loading...</p>
                )}
            </div>


        </div>
    )
}

export default Home
