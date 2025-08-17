import React from 'react'

export const SignalBadge: React.FC<{score:number, verdict: string}> = ({ score, verdict }) => {
  const cls = score>=60 ? 'badge-positive' : 'badge-negative'
  return <span className={`badge ${cls}`}>{verdict} · {score}</span>
}
