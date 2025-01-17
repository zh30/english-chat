import { useCallback, useEffect, useState, useRef } from 'react'
import { Button } from './components/ui/button';
import { Textarea } from './components/ui/textarea';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from './components/ui/select';

const model_id = "onnx-community/Kokoro-82M-ONNX";
const voices = ["af", "af_bella", "af_nicole", "af_sarah", "af_sarah", "af_sky", "am_adam", "am_michael", "bf_emma", "bf_isabella", "bm_george", "bm_lewis"]

function App() {
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [text, setText] = useState("Life is like a box of chocolates. You never know what you're gonna get.")
  const [voice, setVoice] = useState("af")

  const workerRef = useRef<Worker | null>(null)

  const handleClick = useCallback(async () => {
    if (!workerRef.current) return
    setGenerating(true)
    workerRef.current.postMessage({
      type: 'generate',
      payload: {
        text,
        voice
      }
    });
  }, [text, voice])

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
    <div className='flex items-center justify-center h-screen p-4'>
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
          <p className="text-sm text-muted-foreground opacity-50">
            Please enter English text
          </p>
          <div className='flex flex-row gap-2'>
            <Select value={voice} onValueChange={setVoice} disabled={loading || generating}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select a fruit" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Voice</SelectLabel>
                  {voices.map((voice) => (
                    <SelectItem key={voice} value={voice} className='capitalize'>{voice}</SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <Button onClick={handleClick} className='ml-auto' disabled={loading || generating}>
              {generating ? 'Generating...' : 'Generate'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
