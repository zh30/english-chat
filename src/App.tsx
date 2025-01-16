import { useCallback, useEffect, useState, useRef } from 'react'
import { Button } from './components/ui/button';
import { Textarea } from './components/ui/textarea';

const model_id = "onnx-community/Kokoro-82M-ONNX";

function App() {
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [text, setText] = useState("Life is like a box of chocolates. You never know what you're gonna get.")
  const workerRef = useRef<Worker | null>(null)

  const handleClick = useCallback(async () => {
    if (!workerRef.current) return
    setGenerating(true)
    workerRef.current.postMessage({
      type: 'generate',
      payload: {
        text,
        voice: "af"
      }
    });
  }, [text])

  useEffect(() => {
    const worker = new Worker(new URL('./tts.worker.ts', import.meta.url), {
      type: 'module'
    });

    worker.onmessage = async (e) => {
      const { type, audio, error } = e.data;
      let audioContext: AudioContext;
      let source: AudioBufferSourceNode;

      switch (type) {
        case 'init_complete':
          setLoading(false);
          break;
        case 'generate_complete':
          audioContext = new AudioContext();
          source = audioContext.createBufferSource();
          source.buffer = await audioContext.decodeAudioData(audio);
          source.connect(audioContext.destination);
          source.start();
          setGenerating(false);
          break;
        case 'error':
          console.error('Worker error:', error);
          setLoading(false);
          setGenerating(false);
          break;
      }
    };

    setLoading(true);
    worker.postMessage({
      type: 'init',
      payload: {
        modelId: model_id,
        dtype: "q8"
      }
    });

    workerRef.current = worker;

    return () => {
      worker.terminate();
    };
  }, []);

  return (
    <div className='flex items-center justify-center h-screen'>
      <div className='rounded-xl border bg-card text-card-foreground shadow container'>
        {loading && <div className='p-6 pb-0'>Loading model...</div>}
        <div className="grid w-full gap-2 p-6">
          <Textarea
            placeholder="Type your message here."
            value={text}
            onChange={(e) => setText(e.target.value)}
            // className='resize-none'
            disabled={loading || generating}
          />
          <p className="text-sm text-muted-foreground">
            Please enter English text
          </p>
          <Button onClick={handleClick} disabled={loading || generating}>
            {generating ? 'Generating...' : 'Generate'}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default App
