'use client'
import React, {useEffect, useState} from 'react'
import { ChordDiagram, Relationship } from '@/components/diagram'

const Home: React.FC = () => {
    const [relInput, setRelInput] = useState<string>('')
    const [relationships, setRelationships] = useState<Relationship[]>([])
    const [loading, setLoading] = useState<boolean>(false)

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
        setLoading(true)
        try {
            const res = await fetch('/data/relationships.csv')
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            const text = await res.text()
            setRelationships(parseCSV(text))
        } catch (err: any) {
            alert(`Failed to load CSV: ${err.message}`)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadStaticCsv()
    }, []);



    return (
        <div className="p-4 space-y-6">
            <div className="border rounded p-4">
                {relationships.length > 0 ? (
                    <ChordDiagram relationships={relationships}  />
                ) : (
                    <p className="text-gray-500">
                        Click “Load CSV from /public” or enter data above to render.
                    </p>
                )}
            </div>
        </div>
    )
}

export default Home
