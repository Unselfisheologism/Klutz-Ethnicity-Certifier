'use client';

import * as React from 'react';
import { useState, useCallback, useTransition } from 'react';
import { useDropzone } from 'react-dropzone';
import { FileUp, ClipboardPaste, Loader2, Image as ImageIcon, FileText, AlertTriangle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { analyzeImageEthics, AnalyzeImageEthicsOutput } from '@/ai/flows/analyze-image-ethics';
import { analyzeTextEthics, AnalyzeTextEthicsOutput } from '@/ai/flows/analyze-text-ethics';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

type AnalysisResult = AnalyzeImageEthicsOutput | AnalyzeTextEthicsOutput | null;
type AnalysisType = 'image' | 'text' | null;

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ACCEPTED_TEXT_TYPES = ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

function fileToDataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function ContentAnalysis() {
  const [file, setFile] = useState<File | null>(null);
  const [textInput, setTextInput] = useState<string>('');
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult>(null);
  const [analysisType, setAnalysisType] = useState<AnalysisType>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0); // For visual feedback, not actual upload state
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setError(null);
    setAnalysisResult(null);
    setTextInput(''); // Clear text input when dropping file
    const droppedFile = acceptedFiles[0];

    if (droppedFile) {
      const fileType = droppedFile.type;
      if (ACCEPTED_IMAGE_TYPES.includes(fileType)) {
        setFile(droppedFile);
        setAnalysisType('image');
        setUploadProgress(100); // Simulate instant upload for demo
      } else if (ACCEPTED_TEXT_TYPES.includes(fileType)) {
         setFile(droppedFile);
         setAnalysisType('text');
         setUploadProgress(100); // Simulate instant upload for demo
      } else {
        setError(`Unsupported file type: ${fileType}. Please upload images (jpg, png) or text documents (pdf, doc, txt).`);
        setFile(null);
        setAnalysisType(null);
        setUploadProgress(0);
      }
    }
  }, []);

  const handlePaste = useCallback(async (event: React.ClipboardEvent) => {
    setError(null);
    setAnalysisResult(null);
    setFile(null); // Clear file input when pasting

    const items = event.clipboardData.items;
    let foundContent = false;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file' && ACCEPTED_IMAGE_TYPES.includes(item.type)) {
        const blob = item.getAsFile();
        if (blob) {
          setFile(blob);
          setAnalysisType('image');
          setUploadProgress(100);
          setTextInput(''); // Clear text input
          foundContent = true;
          break;
        }
      } else if (item.kind === 'string' && item.type.startsWith('text/plain')) {
        item.getAsString((text) => {
          setTextInput(text);
          setAnalysisType('text');
          setUploadProgress(0); // No file upload for text paste
          setFile(null); // Clear file
        });
        foundContent = true;
        break;
      }
    }

    if (!foundContent) {
        setError('Pasted content is not a supported image or plain text.');
        setAnalysisType(null);
        setUploadProgress(0);
    }
  }, []);

  const handleTextChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      setTextInput(event.target.value);
      if (event.target.value.trim()) {
          setAnalysisType('text');
          setFile(null); // Clear file if text is entered
          setError(null);
          setAnalysisResult(null);
          setUploadProgress(0);
      } else {
          // If text area becomes empty, reset analysis type unless a file is selected
          if (!file) {
              setAnalysisType(null);
          }
      }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, noClick: true, multiple: false });

  const handleAnalyze = () => {
    if (!file && !textInput.trim()) {
      setError('Please upload a file or paste/enter text to analyze.');
      return;
    }
    if (file && textInput.trim()) {
      setError('Please analyze either the uploaded file or the entered text, not both.');
      return;
    }

    setError(null);
    setIsAnalyzing(true);
    setAnalysisResult(null);

    startTransition(async () => {
      try {
        let result: AnalysisResult = null;
        let dataUri = '';

        if (file) {
           dataUri = await fileToDataUri(file);
        } else if (textInput.trim()) {
           const base64Text = btoa(unescape(encodeURIComponent(textInput.trim())));
           dataUri = `data:text/plain;base64,${base64Text}`;
        }


        if (analysisType === 'image' && file) {
          result = await analyzeImageEthics({ photoDataUri: dataUri });
        } else if (analysisType === 'text' && (file || textInput.trim())) {
          result = await analyzeTextEthics({ textDataUri: dataUri });
        } else {
            throw new Error("Invalid analysis type or missing content.");
        }

        setAnalysisResult(result);
        toast({
          title: 'Analysis Complete',
          description: 'Ethical review finished successfully.',
        });
      } catch (err) {
        console.error('Analysis failed:', err);
        setError(`Analysis failed. ${err instanceof Error ? err.message : 'Please try again.'}`);
        toast({
          variant: 'destructive',
          title: 'Analysis Error',
          description: `An error occurred during analysis. ${err instanceof Error ? err.message : 'Please check the console and try again.'}`,
        });
      } finally {
        setIsAnalyzing(false);
      }
    });
  };

  const renderResult = () => {
    if (!analysisResult) return null;

    if (analysisType === 'image' && 'isEthical' in analysisResult) {
       const imageResult = analysisResult as AnalyzeImageEthicsOutput;
       return (
        <Alert variant={imageResult.isEthical ? "default" : "destructive"} className="mt-4">
          {imageResult.isEthical ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          <AlertTitle>{imageResult.isEthical ? "Ethical Content Detected" : "Potential Ethical Concerns Found"}</AlertTitle>
          <AlertDescription>
            <p className="font-semibold mt-2">Reasoning:</p>
            <p>{imageResult.reasoning}</p>
            {!imageResult.isEthical && imageResult.ethicalViolations?.length > 0 && (
              <>
                <p className="font-semibold mt-2">Detected Violations:</p>
                <ul className="list-disc list-inside">
                  {imageResult.ethicalViolations.map((violation, index) => (
                    <li key={index}>{violation}</li>
                  ))}
                </ul>
              </>
            )}
          </AlertDescription>
        </Alert>
      );
    } else if (analysisType === 'text' && 'ethicalAnalysis' in analysisResult) {
        const textResult = analysisResult as AnalyzeTextEthicsOutput;
        const { hasEthicalConcerns, ethicalViolations, summary } = textResult.ethicalAnalysis;
        return (
        <Alert variant={!hasEthicalConcerns ? "default" : "destructive"} className="mt-4">
          {!hasEthicalConcerns ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          <AlertTitle>{!hasEthicalConcerns ? "No Major Ethical Concerns Found" : "Potential Ethical Concerns Found"}</AlertTitle>
          <AlertDescription>
            <p className="font-semibold mt-2">Summary:</p>
            <p>{summary}</p>
            {hasEthicalConcerns && ethicalViolations?.length > 0 && (
              <>
                <p className="font-semibold mt-2">Detected Violations:</p>
                <ul className="list-disc list-inside">
                  {ethicalViolations.map((violation, index) => (
                    <li key={index}>{violation}</li>
                  ))}
                </ul>
              </>
            )}
          </AlertDescription>
        </Alert>
      );
    }
    return null; // Should not happen if logic is correct
  };

  const clearContent = () => {
    setFile(null);
    setTextInput('');
    setAnalysisResult(null);
    setAnalysisType(null);
    setError(null);
    setUploadProgress(0);
    setIsAnalyzing(false);
  };

  const isContentPresent = file || textInput.trim();


  return (
    <Card className="w-full max-w-2xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">Content Ethics Analyzer</CardTitle>
        <CardDescription>Upload an image or text to check for potential ethical concerns.</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="upload" className="w-full" onPaste={handlePaste}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="upload">Upload File</TabsTrigger>
            <TabsTrigger value="paste">Paste Text</TabsTrigger>
          </TabsList>
          <TabsContent value="upload">
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'
              }`}
            >
              <input {...getInputProps()} accept={`${ACCEPTED_IMAGE_TYPES.join(',')},${ACCEPTED_TEXT_TYPES.join(',')}`} />
              <FileUp className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              {isDragActive ? (
                <p className="text-primary font-semibold">Drop the file here ...</p>
              ) : (
                 <>
                    <p className="text-muted-foreground">Drag & drop an image (jpg, png) or text (pdf, doc, txt) file here</p>
                    <Button variant="outline" size="sm" className="mt-4" onClick={(e) => {
                        e.stopPropagation(); // Prevent triggering dropzone
                        const inputElement = document.querySelector('input[type="file"]') as HTMLInputElement | null;
                        inputElement?.click();
                    }}>
                        Or Click to Upload
                    </Button>
                 </>
              )}
            </div>
            {file && uploadProgress > 0 && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-foreground truncate max-w-[80%] flex items-center gap-2">
                    {analysisType === 'image' ? <ImageIcon className="w-4 h-4 inline-block mr-1 text-muted-foreground" /> : <FileText className="w-4 h-4 inline-block mr-1 text-muted-foreground" />}
                    {file.name}
                  </span>
                  <span className="text-sm text-muted-foreground">{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="w-full h-2" />
              </div>
            )}
          </TabsContent>
          <TabsContent value="paste">
             <Textarea
                placeholder="Paste your text content here..."
                value={textInput}
                onChange={handleTextChange}
                className="min-h-[150px] resize-y"
                aria-label="Paste text content"
             />
             <p className="text-xs text-muted-foreground mt-1">You can also paste images directly onto the page.</p>
          </TabsContent>
        </Tabs>


        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Separator className="my-6" />

        <div className="flex justify-end gap-2">
          {isContentPresent && (
            <Button variant="outline" onClick={clearContent} disabled={isAnalyzing}>
              Clear
            </Button>
          )}
          <Button onClick={handleAnalyze} disabled={isAnalyzing || isPending || !isContentPresent}>
            {isAnalyzing || isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              'Analyze Content'
            )}
          </Button>
        </div>

        {(isAnalyzing || isPending) && (
          <div className="mt-4 text-center text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span>Processing your content, please wait...</span>
          </div>
        )}

        {analysisResult && !isAnalyzing && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-2">Analysis Results</h3>
            {renderResult()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
