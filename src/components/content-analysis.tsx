'use client';

import * as React from 'react';
import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { FileUp, ClipboardPaste, Loader2, Image as ImageIcon, FileText, AlertTriangle, CheckCircle, Download, ClipboardCopy, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from '@/lib/utils'; // Import cn utility

// Define the expected structure for analysis results from Puter.js
type PuterAnalysisResult = {
  isEthical?: boolean;
  ethicalViolations?: string[];
  reasoning?: string; // Primarily for images
  summary?: string; // Primarily for text
  hasEthicalConcerns?: boolean; // Primarily for text
} | null;

type AnalysisType = 'image' | 'text' | null;

// Accepted file types
const ACCEPTED_IMAGE_TYPES: { [key: string]: string[] } = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
  'image/bmp': ['.bmp'],
  'image/tiff': ['.tif', '.tiff'],
  // Add more image types as needed
};
const ACCEPTED_TEXT_TYPES: { [key: string]: string[] } = {
  'application/pdf': ['.pdf'],
  'text/plain': ['.txt'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'text/markdown': ['.md'],
  'text/csv': ['.csv'],
  'application/rtf': ['.rtf'],
  // Add more text types as needed
};

// Combine all accepted types for dropzone
const ALL_ACCEPTED_TYPES = { ...ACCEPTED_IMAGE_TYPES, ...ACCEPTED_TEXT_TYPES };


// Utility to read file content as text
function readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
        reader.readAsText(file);
    });
}

// Utility to read file as Data URI
function fileToDataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Type guard for Puter object
declare global {
  interface Window {
    puter?: any; // Use 'any' for simplicity or define a more specific type if available
  }
}

// Function to clean potential markdown code blocks from AI response
function cleanJsonResponse(rawJson: string): string {
  // Remove ```json ... ``` markdown code blocks, handling potential whitespace variations
  const cleaned = rawJson.trim().replace(/^```(?:json)?\s*([\s\S]*?)\s*```$/, '$1');
  return cleaned;
}

export function ContentAnalysis() {
  const [file, setFile] = useState<File | null>(null);
  const [textInput, setTextInput] = useState<string>('');
  const [analysisResult, setAnalysisResult] = useState<PuterAnalysisResult>(null);
  const [analysisType, setAnalysisType] = useState<AnalysisType>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setError(null);
    setAnalysisResult(null);
    setTextInput(''); // Clear text input when dropping file
    const droppedFile = acceptedFiles[0];

    if (droppedFile) {
      const fileType = droppedFile.type;
      if (Object.keys(ACCEPTED_IMAGE_TYPES).includes(fileType)) {
        setFile(droppedFile);
        setAnalysisType('image');
        setUploadProgress(100);
      } else if (Object.keys(ACCEPTED_TEXT_TYPES).includes(fileType)) {
         setFile(droppedFile);
         setAnalysisType('text');
         setUploadProgress(100);
      } else {
        setError(`Unsupported file type: ${fileType}. Please upload a supported image or text document.`);
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
       if (item.kind === 'file' && Object.keys(ACCEPTED_IMAGE_TYPES).includes(item.type)) {
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
          setUploadProgress(0);
          setFile(null);
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

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
      onDrop,
      noClick: true, // Prevents opening file dialog on click, use button instead
      multiple: false,
      accept: ALL_ACCEPTED_TYPES
  });


 const handleAnalyze = async () => {
    if (!file && !textInput.trim()) {
      setError('Please upload a file or paste/enter text to analyze.');
      return;
    }
    if (file && textInput.trim()) {
      setError('Please analyze either the uploaded file or the entered text, not both.');
      return;
    }
    if (typeof window === 'undefined' || !window.puter) {
      setError('Puter.js is not loaded. Please ensure the script is included and loaded correctly.');
      return;
    }

    setError(null);
    setIsAnalyzing(true);
    setAnalysisResult(null);

    const puter = window.puter;

    try {
      let result: PuterAnalysisResult = null;
      const promptBase = `You are an AI ethics analyst. Analyze the following content for potential ethical concerns.
      Identify specific types of ethical violations (e.g., hate speech, discrimination, misinformation, harmful content, privacy violation).
      Determine if the content is ethical (isEthical: true/false or hasEthicalConcerns: true/false).
      Provide a brief reasoning or summary.
      Respond ONLY with a valid JSON object containing the fields: 'isEthical' (boolean, for images), 'hasEthicalConcerns' (boolean, for text), 'ethicalViolations' (array of strings), and 'reasoning' (string, for images) or 'summary' (string, for text). Example for image: {"isEthical": false, "ethicalViolations": ["Potential Hate Speech"], "reasoning": "Contains symbols associated with hate groups."}. Example for text: {"hasEthicalConcerns": true, "ethicalViolations": ["Misinformation"], "summary": "The text promotes baseless claims about a public health issue."}`;


      if (analysisType === 'image' && file) {
        const imageDataUrl = await fileToDataUri(file);
        const prompt = `${promptBase}\n\nContent Type: Image`;

        const response = await puter.ai.chat(prompt, imageDataUrl, false, { model: 'gpt-4o' });
        // Attempt to get string content safely, handling various possible response structures
        let rawResult = '';
        if (typeof response === 'string') {
            rawResult = response;
        } else if (typeof response === 'object' && response !== null) {
            if (response.message && typeof response.message.content === 'string') {
                rawResult = response.message.content;
            } else if (typeof response.text === 'string') {
                rawResult = response.text;
            } else {
                // Fallback: Try stringifying the entire object, though less ideal
                try {
                  rawResult = JSON.stringify(response);
                } catch (stringifyError) {
                  console.error("Could not stringify the response object:", stringifyError);
                  rawResult = '{ "error": "Could not process response object" }'; // Provide a default error JSON string
                }
            }
        } else {
             console.error("Unexpected response type:", typeof response);
             rawResult = '{ "error": "Unexpected response type from AI" }';
        }

        const cleanedResult = cleanJsonResponse(rawResult);

        try {
           const parsedResult = JSON.parse(cleanedResult);
           result = {
             isEthical: parsedResult.isEthical ?? !parsedResult.hasEthicalConcerns,
             ethicalViolations: parsedResult.ethicalViolations || [],
             reasoning: parsedResult.reasoning || parsedResult.summary || "No details provided.",
           };
        } catch (parseError) {
           console.error("Failed to parse AI response (Image):", parseError, "Cleaned:", cleanedResult, "Raw:", rawResult);
           setError(`Failed to parse AI response. Raw output: ${cleanedResult}`); // Set error state
           setIsAnalyzing(false);
           return; // Stop execution here
        }


      } else if (analysisType === 'text' && (file || textInput.trim())) {
        let textContent = '';
        if (file) {
          textContent = await readFileAsText(file);
        } else {
          textContent = textInput.trim();
        }
        const prompt = `${promptBase}\n\nContent Type: Text\n\nText Content:\n${textContent}`;

        const response = await puter.ai.chat(prompt, false, { model: 'gpt-4o' });
         // Attempt to get string content safely, handling various possible response structures
        let rawResult = '';
        if (typeof response === 'string') {
            rawResult = response;
        } else if (typeof response === 'object' && response !== null) {
            if (response.message && typeof response.message.content === 'string') {
                rawResult = response.message.content;
            } else if (typeof response.text === 'string') {
                rawResult = response.text;
            } else {
                // Fallback: Try stringifying the entire object, though less ideal
                 try {
                  rawResult = JSON.stringify(response);
                 } catch (stringifyError) {
                   console.error("Could not stringify the response object:", stringifyError);
                   rawResult = '{ "error": "Could not process response object" }'; // Provide a default error JSON string
                 }
            }
        } else {
             console.error("Unexpected response type:", typeof response);
             rawResult = '{ "error": "Unexpected response type from AI" }';
        }
        const cleanedResult = cleanJsonResponse(rawResult);

        try {
            const parsedResult = JSON.parse(cleanedResult);
             result = {
               hasEthicalConcerns: parsedResult.hasEthicalConcerns ?? !parsedResult.isEthical,
               ethicalViolations: parsedResult.ethicalViolations || [],
               summary: parsedResult.summary || parsedResult.reasoning || "No details provided.",
             };
        } catch (parseError) {
             console.error("Failed to parse AI response (Text):", parseError, "Cleaned:", cleanedResult, "Raw:", rawResult);
             setError(`Failed to parse AI response. Raw output: ${cleanedResult}`); // Set error state
             setIsAnalyzing(false);
             return; // Stop execution here
        }

      } else {
        throw new Error("Invalid analysis type or missing content.");
      }

      setAnalysisResult(result);
      toast({
        title: 'Analysis Complete',
        description: 'Ethical review finished successfully.',
      });
    } catch (err) {
      console.error('Raw analysis error:', err);

      let errorMessage = 'An unknown error occurred. Please try again.';
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      } else if (typeof err === 'object' && err !== null) {
        try {
          if ('message' in err) {
            errorMessage = String(err.message);
          } else {
            errorMessage = JSON.stringify(err);
          }
        } catch (stringifyError) {
          errorMessage = 'An unknown non-standard error occurred.'
        }
      }

      console.error('Processed analysis error message:', errorMessage);
      setError(`Analysis failed: ${errorMessage}`);
      toast({
        variant: 'destructive',
        title: 'Analysis Error',
        description: `An error occurred during analysis. Please check console for details. Message: ${errorMessage}`,
      });

       if (errorMessage.toLowerCase().includes('authenticate') || errorMessage.toLowerCase().includes('sign in')) {
           try {
               if (puter && typeof puter.auth?.signIn === 'function') {
                 await puter.auth.signIn();
                 toast({ title: "Authentication Required", description: "Please try analyzing again after signing in." });
               } else {
                  setError("Authentication function not available. Please ensure Puter.js is fully loaded and you are logged in.");
               }
           } catch (authError: any) {
               console.error("Puter sign-in failed:", authError);
               const authErrorMessage = authError instanceof Error ? authError.message : JSON.stringify(authError);
               setError(`Authentication failed: ${authErrorMessage}. Please ensure you are logged into Puter.`);
           }
       }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const formatResultsForOutput = (result: PuterAnalysisResult): string => {
    if (!result) return "";

    const isContentEthical = result.isEthical === true || result.hasEthicalConcerns === false;
    const violations = result.ethicalViolations || [];
    const explanation = result.reasoning || result.summary || "No detailed explanation provided.";

    let output = `Klutz Ethics - Ethical Analysis Report\n`; // Updated Brand Name
    output += `=====================================\n\n`;

    // Add Certification Badge to output
    if (isContentEthical) {
      output += `[ CERTIFIED: Ethically Clear ]\n\n`;
    } else {
      output += `[ WARNING: Potential Ethical Concerns Found ]\n\n`;
    }

    output += `Overall Assessment: ${isContentEthical ? 'Ethically Clear' : 'Potential Ethical Concerns Found'}\n\n`;
    output += `Explanation:\n${explanation}\n\n`;

    if (violations.length > 0) {
        output += `Detected Violations/Concerns:\n`;
        violations.forEach(violation => {
            output += `- ${violation}\n`;
        });
    } else if (!isContentEthical) {
        output += `No specific violations listed, but concerns were raised based on the explanation.\n`;
    } else {
        output += `No significant ethical violations detected.\n`;
    }

    return output;
  };


  const handleDownloadResult = () => {
    if (!analysisResult) return;
    const resultString = formatResultsForOutput(analysisResult);
    const blob = new Blob([resultString], { type: 'text/plain;charset=utf-8' }); // Specify charset
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Klutz-ethics-report.txt'; // Changed filename
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "Downloaded", description: "Analysis result downloaded as TXT." });
  };

  const handleCopyToClipboard = () => {
    if (!analysisResult) return;
    const resultString = formatResultsForOutput(analysisResult);
    navigator.clipboard.writeText(resultString).then(() => {
      toast({ title: "Copied", description: "Analysis result copied to clipboard as text." });
    }).catch(err => {
      console.error('Failed to copy:', err);
      toast({ variant: "destructive", title: "Copy Failed", description: "Could not copy result to clipboard." });
    });
  };

  const CertificationBadge = ({ isEthical }: { isEthical: boolean }) => (
    <div className={cn(
      "inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium",
      isEthical ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" // Added dark mode styles
    )}>
      {isEthical ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
      {isEthical ? "Ethically Certified" : "Ethical Concerns"}
    </div>
  );

  const renderResult = () => {
    if (!analysisResult) return null;

    const isContentEthical = analysisResult.isEthical === true || analysisResult.hasEthicalConcerns === false;
    const hasConcerns = analysisResult.isEthical === false || analysisResult.hasEthicalConcerns === true;
    const violations = analysisResult.ethicalViolations || [];
    const explanation = analysisResult.reasoning || analysisResult.summary || "No detailed explanation provided.";

    return (
      <>
      <div className="mb-4">
        <CertificationBadge isEthical={isContentEthical} />
      </div>
      <Alert variant={isContentEthical ? "default" : "destructive"} className="mt-4">
        {isContentEthical ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
        <AlertTitle>{isContentEthical ? "Ethical Content Assessment: Clear" : "Potential Ethical Concerns Found"}</AlertTitle>
        <AlertDescription>
          <p className="font-semibold mt-2">Explanation:</p>
          <p className="whitespace-pre-wrap">{explanation}</p>
          {hasConcerns && violations.length > 0 && (
            <>
              <p className="font-semibold mt-2">Detected Violations/Concerns:</p>
              <ul className="list-disc list-inside">
                {violations.map((violation, index) => (
                  <li key={index}>{violation}</li>
                ))}
              </ul>
            </>
          )}
           {!hasConcerns && violations.length > 0 && (
             <>
               <p className="font-semibold mt-2">Minor Points Noted (but not rising to concern level):</p>
                <ul className="list-disc list-inside">
                    {violations.map((violation, index) => (
                        <li key={index}>{violation}</li>
                     ))}
                 </ul>
             </>
           )}
        </AlertDescription>
      </Alert>
       <div className="mt-4 flex flex-wrap justify-end gap-2"> {/* Added flex-wrap */}
           <Button variant="outline" size="lg" onClick={handleDownloadResult}> {/* Increased size */}
             <Download className="mr-2 h-5 w-5" /> {/* Increased icon size */}
              Download TXT
           </Button>
          <Button variant="outline" size="lg" onClick={handleCopyToClipboard}> {/* Increased size */}
             <ClipboardCopy className="mr-2 h-5 w-5" /> {/* Increased icon size */}
            Copy Text
          </Button>
        </div>
      </>
    );
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

  const handleManualUploadClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      // Ensure event target is an element before querying
      if (!(event.target instanceof Element)) return;
      const fileInput = (event.target as HTMLElement).closest('[data-dropzone-root]')?.querySelector('input[type="file"]');
      if (fileInput) {
          (fileInput as HTMLInputElement).click();
      }
  };


  return (
    // Added responsive padding and rounded corners
    <Card className="w-full max-w-4xl mx-auto shadow-lg rounded-lg overflow-hidden">
      {/* Responsive padding */}
      <CardHeader className="p-4 md:p-6">
        {/* Responsive text size */}
        <CardTitle className="text-lg md:text-xl">Content Ethics Analyzer</CardTitle>
        {/* Responsive text size */}
        <CardDescription className="text-sm md:text-base">Upload an image or text file, or paste text to check for potential ethical concerns.</CardDescription>
      </CardHeader>
      {/* Responsive padding */}
      <CardContent className="p-4 md:p-6">
        <Tabs defaultValue="upload" className="w-full" onPaste={handlePaste}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            {/* Responsive text size */}
            <TabsTrigger value="upload" className="text-sm md:text-base">Upload File</TabsTrigger>
            {/* Responsive text size */}
            <TabsTrigger value="paste" className="text-sm md:text-base">Paste Text</TabsTrigger>
          </TabsList>
          <TabsContent value="upload">
            <div
              {...getRootProps({ className: 'dropzone' })}
               data-dropzone-root
               className={`border-2 border-dashed rounded-lg p-4 md:p-8 text-center cursor-pointer transition-colors ${ // Adjusted padding
                isDragActive ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'
              }`}
            >
              <input {...getInputProps()} className="sr-only" />
               {/* Adjusted size */}
              <FileUp className="mx-auto h-8 w-8 md:h-12 md:w-12 text-muted-foreground mb-2 md:mb-4" />
              {isDragActive ? (
                 // Adjusted text size
                <p className="text-primary font-semibold text-sm md:text-base">Drop the file here ...</p>
              ) : (
                 <>
                     {/* Adjusted text size */}
                    <p className="text-muted-foreground text-sm md:text-base">Drag & drop a supported image or text file here</p>
                     {/* Adjusted margin and text size */}
                    <Button variant="outline" size="sm" className="mt-2 md:mt-4 text-xs md:text-sm" onClick={handleManualUploadClick}>
                        Or Click to Upload
                    </Button>
                 </>
              )}
              <p className="text-xs text-muted-foreground mt-2">Supports: Images (jpg, png, gif, etc.), Text (pdf, docx, txt, etc.)</p>
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
              {/* Adjusted min-height and text size */}
             <Textarea
                placeholder="Paste your text content here..."
                value={textInput}
                onChange={handleTextChange}
                className="min-h-[100px] md:min-h-[200px] resize-y text-sm md:text-base"
                aria-label="Paste text content"
             />
             <p className="text-xs text-muted-foreground mt-1">You can also paste images directly onto the page (if browser supported).</p>
          </TabsContent>
        </Tabs>


        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertTriangle className="h-4 w-4" />
             {/* Responsive text size */}
            <AlertTitle className="text-sm md:text-base">Error</AlertTitle>
             {/* Responsive text size */}
            <AlertDescription className="text-xs md:text-sm">{error}</AlertDescription>
          </Alert>
        )}
         {/* Adjusted margin */}
        <Separator className="my-4 md:my-6" />

         {/* Adjusted flex direction */}
        <div className="flex flex-col sm:flex-row justify-end gap-2">
          {isContentPresent && (
             // Responsive width and padding/text size
            <Button variant="outline" onClick={clearContent} disabled={isAnalyzing} className="w-full sm:w-auto text-sm md:text-base px-3 py-1 md:px-4 md:py-2">
              Clear
            </Button>
          )}
           {/* Responsive width and padding/text size */}
          <Button onClick={handleAnalyze} disabled={isAnalyzing || !isContentPresent} className="w-full sm:w-auto text-sm md:text-base px-3 py-1 md:px-4 md:py-2">
            {isAnalyzing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              'Analyze Content'
            )}
          </Button>
        </div>

        {isAnalyzing && (
          <div className="mt-4 text-center text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
             {/* Responsive text size */}
            <span className="text-sm md:text-base">Processing your content, please wait...</span>
          </div>
        )}

        {analysisResult && !isAnalyzing && (
          <div className="mt-6">
             {/* Responsive text size */}
            <h3 className="text-base md:text-lg font-semibold mb-2">Analysis Results</h3>
            {renderResult()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
