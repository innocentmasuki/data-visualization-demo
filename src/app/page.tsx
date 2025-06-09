'use client'
import React, {useEffect, useState} from 'react'
import { ChordDiagram, Relationship } from '@/components/diagram'
import Link from 'next/link'

const Home: React.FC = () => {
    const [relationships, setRelationships] = useState<Relationship[]>([])

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
    }, []);



    return (
        <div className="p-4 space-y-6">
            {relationships.length > 0 && <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold">Relationship Visualization</h1>
                <Link href="/edit" className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded">
                    Edit CSV Data
                </Link>
            </div>}

            <div className="border rounded p-4">
                {relationships.length > 0 ? (
                    <ChordDiagram relationships={relationships}  />
                ) : (
                    <p className="text-gray-500 text-center">
                        Loading...
                    </p>
                )}
            </div>
        </div>
    )
}

export default Home
