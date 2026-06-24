import { useAppState } from './hooks/useAppState.js';
import ConverterForm from './components/ConverterForm.js';
import PreviewArea from './components/PreviewArea.js';
import ErrorBoundary from './components/ErrorBoundary.js';

export default function App() {
  const {
    state,
    setImage,
    setMode,
    setSize,
    setMaxSize,
    setTolerance,
    startConvert,
    convertSuccess,
    convertError,
    goToForm,
    reset,
  } = useAppState();

  const effectiveView = state.view === 'preview' && !state.result ? 'form' : state.view;

  return (
    <div className="app">
      <header className="app-header">
        <h1>拼豆图纸转换器</h1>
        <p className="app-subtitle">将任意图片转换为拼豆像素图纸</p>
      </header>
      <main className="app-main">
        <ErrorBoundary>
        {effectiveView === 'form' ? (
          <ConverterForm
            mode={state.selectedMode}
            imageFile={state.imageFile}
            imagePreviewUrl={state.imagePreviewUrl}
            selectedSize={state.selectedSize}
            maxSize={state.maxSize}
            tolerance={state.tolerance}
            loading={state.loading}
            error={state.error}
            onModeChange={setMode}
            onImageChange={setImage}
            onSizeChange={setSize}
            onMaxSizeChange={setMaxSize}
            onToleranceChange={setTolerance}
            onStartConvert={startConvert}
            onConvertSuccess={convertSuccess}
            onConvertError={convertError}
            onReset={reset}
          />
        ) : (
          <PreviewArea
            result={state.result!}
            originalImageUrl={state.imagePreviewUrl}
            onReUpload={reset}
            onChangeSize={goToForm}
          />
        )}
        </ErrorBoundary>
      </main>
      <footer className="app-footer">
        <p>拼豆爱好者工具</p>
      </footer>
    </div>
  );
}
