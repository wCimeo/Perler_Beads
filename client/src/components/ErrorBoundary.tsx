import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Component stack:', info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '2rem',
          maxWidth: 700,
          margin: '2rem auto',
          background: '#fff3f3',
          border: '2px solid #e74c3c',
          borderRadius: 8,
          fontFamily: 'monospace',
        }}>
          <h2 style={{ color: '#e74c3c', marginBottom: '1rem' }}>
            页面渲染错误
          </h2>
          <pre style={{
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            background: '#fff',
            padding: '1rem',
            borderRadius: 4,
            border: '1px solid #ddd',
            fontSize: 13,
            lineHeight: 1.5,
            color: '#333',
          }}>
            {this.state.error?.message || '未知错误'}
          </pre>
          <p style={{ marginTop: '1rem', color: '#7f8c8d', fontSize: 14 }}>
            请打开浏览器控制台查看完整错误堆栈
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
