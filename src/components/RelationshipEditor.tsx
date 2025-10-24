"use client"
import React, { useMemo, useState } from 'react'
import { Relationship } from './diagram'

export type RelationshipEditorProps = {
  relationships: Relationship[]
  setRelationships: React.Dispatch<React.SetStateAction<Relationship[]>>
}

const downloadText = (filename: string, text: string) => {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

const toCsv = (rels: Relationship[]) => rels.map(r => `${r.source},${r.target},${r.value}`).join('\n')
const clean = (s: string) => s.replace(/\s+/g, ' ').trim()
const defaultNewValue = 10

const RelationshipCard: React.FC<{ rel: Relationship; index: number; onDelete: (i:number)=>void; onEditSource:(oldS:string,nextS:string)=>void }> = ({ rel, index, onDelete, onEditSource }) => {
  const [editing, setEditing] = useState(false)
  const [localSource, setLocalSource] = useState(rel.source)
  return (
    <div className='bg-white border rounded p-2 shadow-sm mb-2 cursor-grab' draggable onDragStart={e => { e.dataTransfer.setData('text/plain', String(index)) }}>
      {!editing ? (
        <div className='flex items-start gap-2'>
          <div className='flex-1 min-w-0'>
            <div className='font-medium truncate' title={rel.source}>{rel.source}</div>
            <div className='text-xs text-gray-500'>value: {rel.value}</div>
          </div>
          <div className='flex items-center gap-1'>
            <button className='text-xs px-2 py-1 border rounded' onClick={() => setEditing(true)}>Edit</button>
            <button className='text-xs px-2 py-1 border rounded text-red-600' onClick={() => onDelete(index)}>Delete</button>
          </div>
        </div>
      ) : (
        <div className='space-y-2'>
          <div className='text-xs text-gray-600'>Editing this source will update all relationships with the same source label.</div>
          <input className='w-full border rounded px-2 py-1 text-sm' value={localSource} onChange={e => setLocalSource(e.target.value)} />
          <div className='flex gap-2'>
            <button className='text-xs px-2 py-1 border rounded bg-blue-600 text-white' onClick={() => { const src = clean(localSource); if (!src) return alert('Source cannot be empty'); onEditSource(rel.source, src); setEditing(false) }}>Save</button>
            <button className='text-xs px-2 py-1 border rounded' onClick={() => { setLocalSource(rel.source); setEditing(false) }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}

export const RelationshipEditor: React.FC<RelationshipEditorProps> = ({ relationships, setRelationships }) => {
  const columns = useMemo(() => {
    const map = new Map<string, { target: string; items: { rel: Relationship; index: number }[] }>()
    relationships.forEach((rel, index) => {
      if (!map.has(rel.target)) map.set(rel.target, { target: rel.target, items: [] })
      map.get(rel.target)!.items.push({ rel, index })
    })
    return Array.from(map.values()).sort((a,b)=>a.target.localeCompare(b.target))
  }, [relationships])

  const [newType, setNewType] = useState<'proces' | 'gebied' | 'free'>('proces')
  const [newCode, setNewCode] = useState('A1')
  const [newName, setNewName] = useState('')
  const [newTarget, setNewTarget] = useState('')
  const [newTargetMode, setNewTargetMode] = useState<'select' | 'custom'>('select')
  const [codeError, setCodeError] = useState('')
  const [nameError, setNameError] = useState('')
  const [targetError, setTargetError] = useState('')
  const [addForTarget, setAddForTarget] = useState<string | null>(null)
  const [selectedExistingSource, setSelectedExistingSource] = useState('')
  const [quickAddError, setQuickAddError] = useState('')
  const [showAddColumn, setShowAddColumn] = useState(false)
  const [newColumnName, setNewColumnName] = useState('')
  const [selectedSourceForNewColumn, setSelectedSourceForNewColumn] = useState('')
  const [addColumnError, setAddColumnError] = useState('')

  const allTargets = useMemo(() => Array.from(new Set(relationships.map(r=>r.target))).sort(), [relationships])
  const allSources = useMemo(() => Array.from(new Set(relationships.map(r=>r.source))).sort(), [relationships])

  const moveToTarget = (index:number, newTargetName:string) => {
    const target = clean(newTargetName)
    if (!Number.isInteger(index) || !target) return
    setRelationships((prev: Relationship[]) => {
      if (!prev[index]) return prev
      const next = [...prev]
      next[index] = { ...next[index], target }
      return next
    })
  }
  const deleteRel = (index:number) => setRelationships((p:Relationship[]) => p.filter((_,i)=>i!==index))
  const editSource = (oldSource:string, nextSource:string) => setRelationships((p:Relationship[]) => p.map(r=> r.source===oldSource?{...r,source:nextSource}:r))
  const renameTarget = (oldTarget:string, nextTarget:string) => { const to = clean(nextTarget); if(!to) return; setRelationships((p:Relationship[])=>p.map(r=> r.target===oldTarget?{...r,target:to}:r)) }

  const addRelationship = () => {
    setCodeError(''); setNameError(''); setTargetError('')
    const codeClean = clean(newCode); const nameClean = clean(newName); const targetClean = clean(newTarget)
    let hasError = false
    if(!codeClean){ setCodeError('Please enter a code'); hasError = true } else {
      if(newType==='proces' && !/^[A-Z][0-9]+$/.test(codeClean)){ setCodeError('Invalid code'); hasError = true }
      if(newType==='gebied' && !/^[A-Z]\.$/.test(codeClean)){ setCodeError('Invalid code'); hasError = true }
    }
    if(!nameClean){ setNameError('Please enter a name'); hasError = true }
    if(!targetClean){ setTargetError('Please select or enter a target'); hasError = true }
    const src = `${codeClean} ${nameClean}`
    if(!hasError && relationships.some(r=> r.source===src && r.target===targetClean)){ setTargetError('Relationship exists'); hasError = true }
    if(hasError) return
    setRelationships((p:Relationship[]) => [...p, { source: src, target: targetClean, value: defaultNewValue }])
    setNewName(''); setNewCode('A1'); setNewTarget('')
  }

  const handleDropOnColumn = (e:React.DragEvent<HTMLDivElement>, target:string) => { e.preventDefault(); const id = e.dataTransfer.getData('text/plain'); const idx = Number(id); if(!Number.isInteger(idx)) return; moveToTarget(idx, target) }

  return (
    <div className='space-y-4'>
      <div className='flex flex-wrap items-center gap-2'>
        <button className='px-3 py-1.5 text-sm border rounded' onClick={()=>downloadText('relationships.csv', toCsv(relationships))}>Download edited CSV</button>
      </div>
      <div className='border rounded p-3 bg-gray-50'>
        <div className='font-medium mb-2'>Add new relationship</div>
        <div className='grid gap-2 md:grid-cols-4'>
          <div className='flex items-center gap-2'>
            <label className='text-sm whitespace-nowrap'>Type</label>
            <select className='border rounded px-2 py-1 text-sm' value={newType} onChange={e=>setNewType(e.target.value as any)}>
              <option value='proces'>Proces</option>
              <option value='gebied'>Procesgebied</option>
              <option value='free'>Free</option>
            </select>
          </div>
          <div>
            <input className={`w-full border rounded px-2 py-1 text-sm ${codeError?'border-red-500':''}`} value={newCode} onChange={e=>setNewCode(e.target.value)} placeholder={newType==='gebied'?'Code (e.g., C.)':'Code (e.g., C1)'} />
            {codeError && <div className='text-xs text-red-600 mt-1'>{codeError}</div>}
          </div>
          <div className='md:col-span-2'>
            <input className={`w-full border rounded px-2 py-1 text-sm ${nameError?'border-red-500':''}`} value={newName} onChange={e=>setNewName(e.target.value)} placeholder='Name (e.g., Reparatie Onderhoud)' />
            {nameError && <div className='text-xs text-red-600 mt-1'>{nameError}</div>}
          </div>
          <div>
            {newTargetMode==='select' ? (<>
              <select className={`w-full border rounded px-2 py-1 text-sm ${targetError?'border-red-500':''}`} value={newTarget || ''} onChange={e=>{const val=e.target.value; if(val==='__new__'){setNewTargetMode('custom'); setNewTarget('')} else setNewTarget(val)}}>
                <option value=''>Select container…</option>
                {allTargets.map(t=> <option key={t} value={t}>{t}</option>)}
                <option value='__new__'>➕ New container…</option>
              </select>
              {targetError && <div className='text-xs text-red-600 mt-1'>{targetError}</div>}
            </>) : (<>
              <div className='flex gap-2'>
                <input className={`w-full border rounded px-2 py-1 text-sm ${targetError?'border-red-500':''}`} value={newTarget} onChange={e=>setNewTarget(e.target.value)} placeholder='New container name' />
                <button className='px-2 border rounded text-sm' onClick={()=>setNewTargetMode('select')}>×</button>
              </div>
              {targetError && <div className='text-xs text-red-600 mt-1'>{targetError}</div>}
            </>)}
          </div>
        </div>
        <div className='mt-2'>
          <button className='px-3 py-1.5 text-sm border rounded bg-blue-600 text-white' onClick={addRelationship}>Add</button>
        </div>
      </div>
      <div className='overflow-x-auto'>
        <div className='min-w-[800px] grid gap-10' style={{gridTemplateColumns:`repeat(${Math.max(columns.length+1,1)}, minmax(220px,1fr))`}}>
          {columns.length===0 ? <div className='text-gray-500'>No relationships yet.</div> : <>
            {columns.map(col => (
              <div key={col.target} className='bg-gray-100 rounded border p-2' onDragOver={e=>e.preventDefault()} onDrop={e=>handleDropOnColumn(e,col.target)}>
                <div className='flex items-center gap-2 mb-2'>
                  <input className='flex-1 border rounded px-2 py-1 text-sm bg-white' value={col.target} onChange={e=>renameTarget(col.target, e.target.value)} />
                  <button className='ml-auto text-xs px-2 py-1 border rounded' onClick={()=>{ setAddForTarget(p=>p===col.target?null:col.target); setSelectedExistingSource(''); setQuickAddError('') }}>+</button>
                </div>
                {addForTarget===col.target && (
                  <div className='bg-white border rounded p-2 mb-2'>
                    <div className='grid gap-2'>
                      <select className='w-full border rounded px-2 py-1 text-sm' value={selectedExistingSource} onChange={e=>setSelectedExistingSource(e.target.value)}>
                        <option value=''>Select existing source…</option>
                        {allSources.map(s=> <option key={s} value={s} disabled={col.items.some(i=>i.rel.source===s)}>{s}{col.items.some(i=>i.rel.source===s)?' (already in column)':''}</option>)}
                      </select>
                      {quickAddError && <div className='text-xs text-red-600'>{quickAddError}</div>}
                      <div className='flex gap-2'>
                        <button className='text-xs px-2 py-1 border rounded bg-blue-600 text-white' onClick={()=>{ setQuickAddError(''); const src=clean(selectedExistingSource); if(!src){setQuickAddError('Please select a source'); return} if(relationships.some(r=>r.source===src && r.target===col.target)){ setQuickAddError('Already exists'); return } setRelationships((p:Relationship[])=>[...p,{source:src,target:col.target,value:defaultNewValue}]); setSelectedExistingSource(''); setAddForTarget(null) }}>Add</button>
                        <button className='text-xs px-2 py-1 border rounded' onClick={()=>{ setAddForTarget(null); setQuickAddError('') }}>Cancel</button>
                      </div>
                    </div>
                  </div>
                )}
                <div>
                  {col.items.map(({rel,index}) => <RelationshipCard key={rel.source+"->"+rel.target+"#"+index} rel={rel} index={index} onDelete={deleteRel} onEditSource={editSource} />)}
                </div>
              </div>
            ))}
            <div className='border-2 border-dashed rounded p-2 flex flex-col justify-start items-center text-gray-600 hover:bg-gray-50 min-h-[120px]'>
              {!showAddColumn ? <button className='text-sm px-3 py-1.5 border rounded' onClick={()=>{ setShowAddColumn(true); setAddColumnError('') }}>+ Add column</button> : <div className='w-full'>
                <div className='font-medium mb-1'>New column</div>
                <div className='grid gap-2'>
                  <input className='w-full border rounded px-2 py-1 text-sm' value={newColumnName} onChange={e=>setNewColumnName(e.target.value)} placeholder='Container name' />
                  <select className='w-full border rounded px-2 py-1 text-sm' value={selectedSourceForNewColumn} onChange={e=>setSelectedSourceForNewColumn(e.target.value)}>
                    <option value=''>Select existing source…</option>
                    {allSources.map(s=> <option key={s} value={s}>{s}</option>)}
                  </select>
                  {addColumnError && <div className='text-xs text-red-600'>{addColumnError}</div>}
                  <div className='flex gap-2'>
                    <button className='text-xs px-2 py-1 border rounded bg-blue-600 text-white' onClick={()=>{ setAddColumnError(''); const target=clean(newColumnName); const src=clean(selectedSourceForNewColumn); if(!target){ setAddColumnError('Enter column name'); return } if(!src){ setAddColumnError('Select a source'); return } if(relationships.some(r=>r.source===src && r.target===target)){ setAddColumnError('Already exists'); return } setRelationships((p:Relationship[])=>[...p,{source:src,target,value:defaultNewValue}]); setNewColumnName(''); setSelectedSourceForNewColumn(''); setShowAddColumn(false) }}>Add</button>
                    <button className='text-xs px-2 py-1 border rounded' onClick={()=>{ setShowAddColumn(false); setAddColumnError('') }}>Cancel</button>
                  </div>
                </div>
              </div>}
            </div>
          </>}
        </div>
      </div>
    </div>
  )
}

export default RelationshipEditor
