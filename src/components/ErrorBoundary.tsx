import React from 'react'

type Props = { children: React.ReactNode }
type State = { hasError: boolean; error?: unknown }

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props){
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: unknown){
    return { hasError: true, error }
  }

  componentDidCatch(error: unknown, info: unknown){
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.error('App crash', error, info)
    }
  }

  render(){
    if (this.state.hasError){
      return (
        <div className="min-h-screen grid place-items-center p-6">
          <div className="card max-w-lg w-full p-6 text-center space-y-3">
            <div className="text-2xl font-black">Something went wrong</div>
            <div className="opacity-70 text-sm">Please restart the app. If this keeps happening, open an issue with steps to reproduce.</div>
            <div className="text-xs opacity-60 break-words">
              {String((this.state.error as any)?.message || this.state.error || 'Unknown error')}
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

