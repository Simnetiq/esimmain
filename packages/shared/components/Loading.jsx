import React from 'react'

const Loading = () => {
  return (
    <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-tufts-blue"></div>
    </div>
  )
}

export default Loading
