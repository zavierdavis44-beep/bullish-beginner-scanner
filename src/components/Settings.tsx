import React, { useEffect, useState } from 'react'
import { QPopover } from './ui/Popover'

type Props = { onSaved?: () => void }

export const Settings: React.FC<Props> = ({ onSaved }) => {
  const [provider, setProvider] = useState<'auto'|'free'|'polygon'>('auto')
  const [polygonKey, setPolygonKey] = useState('')

  useEffect(()=>{
    try {
      const p = window.localStorage.getItem('bbs.provider') as 'auto'|'free'|'polygon'|null
      setProvider(p || 'auto')
      const k = window.localStorage.getItem('bbs.polygonKey') || ''
      setPolygonKey(k)
    } catch {}
  },[])

  function save(){
    try {
      if (provider==='auto') window.localStorage.removeItem('bbs.provider');
      else window.localStorage.setItem('bbs.provider', provider)
      if (polygonKey.trim()) window.localStorage.setItem('bbs.polygonKey', polygonKey.trim())
      else window.localStorage.removeItem('bbs.polygonKey')
    } catch {}
    onSaved?.()
  }

  return (
    <QPopover trigger={<button className="text-xs px-3 py-1.5 rounded-xl border border-slate-700/60 hover:bg-slate-800/60">Settings</button>}>
      <div className="space-y-3">
        <div className="text-sm font-semibold">Data Provider</div>
        <div className="text-xs opacity-80">Choose Auto, Free (Yahoo/Binance), or Polygon (requires key). Free uses public endpoints and needs no signup.</div>
        <div className="flex items-center gap-2">
          <label className="text-sm opacity-80">Provider</label>
          <select value={provider} onChange={e=>setProvider(e.target.value as any)} className="rounded-xl bg-slate-900/80 border border-slate-700/60 px-3 py-2">
            <option value="auto">Auto</option>
            <option value="free">Free</option>
            <option value="polygon">Polygon</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm opacity-80 w-32">Polygon Key</label>
          <input type="password" value={polygonKey} onChange={e=>setPolygonKey(e.target.value)} className="rounded-xl bg-slate-900/80 border border-slate-700/60 px-3 py-2 w-64" placeholder="pk_xxx" />
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={save} className="text-xs px-3 py-1.5 rounded-xl bg-brand-500 text-slate-900">Save</button>
        </div>
      </div>
    </QPopover>
  )
}
