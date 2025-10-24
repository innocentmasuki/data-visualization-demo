"use client"
import React, { useMemo, useState } from "react"
import { Relationship } from "./diagram"

export type RelationshipEditorProps = {
  relationships: Relationship[]
  setRelationships: (rels: Relationship[]) => void
}

// Utility to download text as file
const downloadText = (filename: string, text: string) => {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

const toCsv = (rels: Relationship[]) =>
  rels.map(r => `${r.source},${r.target},${r.value}`).join("\n")

const clean = (s: string) => s.replace(/\s+/g, " ").trim()

const defaultNewValue = 10

const RelationshipCard: React.FC<{
  rel: Relationship
  index: number
  onDelete: (index: number) => void
  onEditSource: (oldSource: string, nextSource: string) => void
  onEditValue: (index: number, value: number) => void
}> = ({ rel, index, onDelete, onEditSource, onEditValue }) => {
  const [editing, setEditing] = useState(false)
  const [localSource, setLocalSource] = useState(rel.source)
  const [localValue, setLocalValue] = useState(rel.value.toString())

  return (
    <div
      className="bg-white border rounded p-2 shadow-sm mb-2 cursor-grab"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", String(index))
        // give some drag image offset
        const img = document.createElement("div")
        img.style.padding = "4px 8px"
        img.style.background = "#eee"
        img.style.position = "absolute"
        img.style.top = "-1000px"
        img.style.left = "-1000px"
        img.textContent = rel.source
        document.body.appendChild(img)
        e.dataTransfer.setDragImage(img, 0, 0)
        setTimeout(() => img.remove(), 0)
      }}
    >
      {!editing ? (
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate" title={rel.source}>{rel.source}</div>
            <div className="text-xs text-gray-500">value: {rel.value}</div>
          </div>
          <div className="flex items-center gap-1">
            <button className="text-xs px-2 py-1 border rounded" onClick={() => setEditing(true)}>Edit</button>
            <button className="text-xs px-2 py-1 border rounded text-red-600" onClick={() => onDelete(index)}>Delete</button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="text-xs text-gray-600">Editing this source will update all relationships with the same source label.</div>
          <input
            className="w-full border rounded px-2 py-1 text-sm"
            value={localSource}
            onChange={e => setLocalSource(e.target.value)}
            placeholder="Source label (e.g., C1 Reparatie Onderhoud or C. Vastgoedbeheer)"
          />
          <input
            className="w-full border rounded px-2 py-1 text-sm"
            value={localValue}
            onChange={e => setLocalValue(e.target.value.replace(/[^0-9]/g, ''))}
            placeholder="Value (number)"
          />
          <div className="flex gap-2">
            <button
              className="text-xs px-2 py-1 border rounded bg-blue-600 text-white"
              onClick={() => {
                const src = clean(localSource)
                const v = Number(localValue)
                if (!src) return alert("Source cannot be empty")
                if (!Number.isFinite(v)) return alert("Value must be a number")
                onEditSource(rel.source, src)
                onEditValue(index, v)
                setEditing(false)
              }}
            >Save</button>
            <button className="text-xs px-2 py-1 border rounded" onClick={() => {
              setLocalSource(rel.source)
              setLocalValue(String(rel.value))
              setEditing(false)
            }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}

export const RelationshipEditor: React.FC<RelationshipEditorProps> = ({ relationships, setRelationships }) => {
  const columns = useMemo(() => {
    const map = new Map<string, { target: string, items: { rel: Relationship, index: number }[] }>()
    relationships.forEach((rel, index) => {
      const key = rel.target
      if (!map.has(key)) map.set(key, { target: key, items: [] })
      map.get(key)!.items.push({ rel, index })
    })
    return Array.from(map.values()).sort((a, b) => a.target.localeCompare(b.target))
  }, [relationships])

  const [newType, setNewType] = useState<'proces' | 'gebied' | 'free'>('proces')
  const [newCode, setNewCode] = useState('A1')
  const [newName, setNewName] = useState('')
  const [newTarget, setNewTarget] = useState('')
  const [newValue, setNewValue] = useState(String(defaultNewValue))

  const allTargets = useMemo(() => Array.from(new Set(relationships.map(r => r.target))).sort(), [relationships])

  const moveToTarget = (index: number, newTargetName: string) => {
    const target = clean(newTargetName)
    if (!Number.isInteger(index as unknown as number) || !target) return
    setRelationships(prev => {
      if (!prev[index]) return prev
      const next = [...prev]
      next[index] = { ...next[index], target }
      return next
    })
  }

  const deleteRel = (index: number) => {
    setRelationships(prev => prev.filter((_, i) => i !== index))
  }

  const editSource = (oldSource: string, nextSource: string) => {
    setRelationships(prev => prev.map(r => r.source === oldSource ? { ...r, source: nextSource } : r))
  }

  const editValue = (index: number, value: number) => {
    setRelationships(prev => {
      const next = [...prev]
      if (next[index]) next[index] = { ...next[index], value }
      return next
    })
  }

  const renameTarget = (oldTarget: string, nextTarget: string) => {
    const to = clean(nextTarget)
    if (!to) return
    setRelationships(prev => prev.map(r => r.target === oldTarget ? { ...r, target: to } : r))
  }

  const addRelationship = () => {
    const codeClean = clean(newCode)
    const nameClean = clean(newName)
    const targetClean = clean(newTarget)
    if (!codeClean || !nameClean) return alert("Please enter code and name for the source")
    if (!targetClean) return alert("Please enter a target (container)")
    const src = newType === 'proces' ? `${codeClean} ${nameClean}`
      : newType === 'gebied' ? `${codeClean} ${nameClean}`
      : `${codeClean} ${nameClean}`
    const value = Number(newValue)
    if (!Number.isFinite(value)) return alert("Value must be numeric")
    setRelationships(prev => [...prev, { source: src, target: targetClean, value }])
    setNewName("")
    setNewCode("A1")
    setNewTarget("")
    setNewValue(String(defaultNewValue))
  }

  const handleDropOnColumn = (e: React.DragEvent<HTMLDivElement>, target: string) => {
    e.preventDefault()
    const id = e.dataTransfer.getData("text/plain")
    const index = Number(id)
    if (!Number.isInteger(index)) return
    moveToTarget(index, target)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          className="px-3 py-1.5 text-sm border rounded"
          onClick={() => downloadText("relationships.csv", toCsv(relationships))}
        >
          Download edited CSV
        </button>
      </div>

      <div className="border rounded p-3 bg-gray-50">
        <div className="font-medium mb-2">Add new relationship</div>
        <div className="grid gap-2 md:grid-cols-5">
          <div className="flex items-center gap-2">
            <label className="text-sm whitespace-nowrap">Type</label>
            <select
              className="border rounded px-2 py-1 text-sm"
              value={newType}
              onChange={e => setNewType(e.target.value as any)}
            >
              <option value="proces">Proces (e.g., C1)</option>
              <option value="gebied">Procesgebied (e.g., C.)</option>
              <option value="free">Free</option>
            </select>
          </div>
          <div>
            <input
              className="w-full border rounded px-2 py-1 text-sm"
              placeholder={newType === 'gebied' ? 'Code (e.g., C.)' : 'Code (e.g., C1)'}
              value={newCode}
              onChange={e => setNewCode(e.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <input
              className="w-full border rounded px-2 py-1 text-sm"
              placeholder="Name (e.g., Reparatie Onderhoud)"
              value={newName}
              onChange={e => setNewName(e.target.value)}
            />
          </div>
          <div>
            <input
              list="targets-list"
              className="w-full border rounded px-2 py-1 text-sm"
              placeholder="Target (container)"
              value={newTarget}
              onChange={e => setNewTarget(e.target.value)}
            />
            <datalist id="targets-list">
              {allTargets.map(t => <option key={t} value={t} />)}
            </datalist>
          </div>
          <div>
            <input
              className="w-full border rounded px-2 py-1 text-sm"
              placeholder="Value"
              value={newValue}
              onChange={e => setNewValue(e.target.value.replace(/[^0-9]/g, ''))}
            />
          </div>
        </div>
        <div className="mt-2">
          <button className="px-3 py-1.5 text-sm border rounded bg-blue-600 text-white" onClick={addRelationship}>Add</button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[800px] grid gap-4" style={{ gridTemplateColumns: `repeat(${Math.max(columns.length, 1)}, minmax(220px, 1fr))` }}>
          {columns.length === 0 ? (
            <div className="text-gray-500">No relationships yet. Add one above to get started.</div>
          ) : (
            columns.map(col => (
              <div key={col.target} className="bg-gray-100 rounded border p-2"
                   onDragOver={(e) => e.preventDefault()}
                   onDrop={(e) => handleDropOnColumn(e, col.target)}
              >
                <div className="flex items-center gap-2 mb-2">
                  <input
                    className="flex-1 border rounded px-2 py-1 text-sm bg-white"
                    value={col.target}
                    onChange={e => renameTarget(col.target, e.target.value)}
                    title="Rename target: updates all relationships in this column"
                  />
                </div>
                <div>
                  {col.items.map(({ rel, index }) => (
                    <RelationshipCard
                      key={`${rel.source}->${rel.target}#${index}`}
                      rel={rel}
                      index={index}
                      onDelete={deleteRel}
                      onEditSource={editSource}
                      onEditValue={editValue}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default RelationshipEditor
