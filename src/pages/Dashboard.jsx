import { useState } from 'react';
import axios from 'axios';
import TextExtractor from '../components/TextExtractor';

export default function Dashboard() {
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [restriction, setRestriction] = useState({ uploaded: false, openai: false });
  const [extractedContent, setExtractedContent] = useState(null);
  const [isExtracting, setIsExtracting] = useState(false);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleFileInput = (e) => {
    const files = Array.from(e.target.files);
    handleFiles(files);
  };

  const handleFiles = (files) => {
    setError('');
    setExtractedContent(null);
    
    for (let file of files) {
      const fileType = file.type;
      const fileName = file.name.toLowerCase();
      
      if (!fileType.includes('pdf') && 
          !fileType.includes('presentation') && 
          !fileName.endsWith('.pdf') && 
          !fileName.endsWith('.ppt') && 
          !fileName.endsWith('.pptx')) {
        setError('Error: Only PDF and PowerPoint files are allowed');
        return;
      }

      if (file.size > 25 * 1024 * 1024) {
        setError('Error: File size exceeds 25MB limit');
        return;
      }
    }

    setUploadedFiles(prev => [...prev, ...files]);
    setIsExtracting(true);
  };

  const removeFile = (index) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    setExtractedContent(null);
    setError('');
  };

  const handleTextExtracted = (data) => {
    console.log('Text extracted:', data);
    setExtractedContent(data);
    setIsExtracting(false);
  };

  const handleGenerate = () => {
    if (uploadedFiles.length === 0) {
      setError('Error: Please upload at least one file');
      return;
    }
    
    if (!extractedContent) {
      setError('Error: Still extracting text from file. Please wait.');
      return;
    }
    
    setShowModal(true);
  };

  const handleUploadAndGenerate = async () => {
    if (uploadedFiles.length === 0) {
      alert("No file selected!");
      return;
    }

    const formData = new FormData();
    formData.append("myFile", uploadedFiles[0]);

    try {
      const res = await axios.post("http://localhost:4000/api/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        withCredentials: true
      });
      
      console.log("Upload success:", res.data.filename);
      
      // Now send the extracted content to generate summary
      await generateSummary();
      
    } catch (err) {
      if (err.response) {
        if (err.response.status === 409) {
          alert("File with the same name already exists. Please rename your file.");
        } else if (err.response.status === 401) {
          alert("You must be logged in to upload files.");
        } else {
          alert("Upload failed: " + err.response.data.error);
        }
      } else {
        alert("Network error, please try again later.");
      }    
    }
  };

  const generateSummary = async () => {
    try {
      const payload = {
        content: extractedContent.content,
        title: extractedContent.title,
        restrictions: restriction,
        metadata: {
          source: extractedContent.source,
          wordCount: extractedContent.wordCount,
          slideCount: extractedContent.slideCount
        }
      };

      const response = await axios.post(
        "http://localhost:4000/api/generate-summary",
        payload,
        { withCredentials: true }
      );

      console.log("Summary generated:", response.data);
      alert("Summary generated successfully!");
      
      // Optionally redirect to notes page or show summary
      
    } catch (err) {
      console.error("Summary generation error:", err);
      alert("Failed to generate summary");
    }
  };

  const GenerateModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-sm sm:max-w-md lg:max-w-lg shadow-2xl transform transition-all scale-100 animate-in fade-in duration-200">
        <div className="text-center mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl font-bold mb-2">GENERATE SUMMARY</h2>
          <p className="text-gray-600 text-sm sm:text-base">Choose restrictions:</p>
        </div>

        {extractedContent && (
          <div className="mb-6 bg-green-50 border border-green-200 p-4 rounded-xl">
            <p className="text-sm text-gray-700">
              <strong>Extracted:</strong> {extractedContent.wordCount} words from {extractedContent.source}
            </p>
          </div>
        )}

        <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
          <label className="flex items-start sm:items-center space-x-3 cursor-pointer p-3 rounded-xl hover:bg-gray-50 transition-colors">
            <input 
              type="checkbox" 
              className="w-4 h-4 mt-1 sm:mt-0 flex-shrink-0"
              checked={restriction.uploaded}
              onChange={(e) => setRestriction(prev => ({ ...prev, uploaded: e.target.checked }))}
            />
            <div className="flex-1">
              <span className="font-medium text-sm sm:text-base">Uploaded File Only</span>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">
                Restrict the generation to the uploaded file content only
              </p>
            </div>
          </label>

          <label className="flex items-start sm:items-center space-x-3 cursor-pointer p-3 rounded-xl hover:bg-gray-50 transition-colors">
            <input 
              type="checkbox" 
              className="w-4 h-4 mt-1 sm:mt-0 flex-shrink-0"
              checked={restriction.openai}
              onChange={(e) => setRestriction(prev => ({ ...prev, openai: e.target.checked }))}
            />
            <div className="flex-1">
              <span className="font-medium text-sm sm:text-base">AI Knowledge Base</span>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">
                Allow AI to use its knowledge about technology subjects
              </p>
            </div>
          </label>
        </div>

        <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
          <button 
            onClick={() => setShowModal(false)}
            className="w-full sm:flex-1 bg-gray-200 text-gray-800 py-3 px-4 rounded-xl font-medium hover:bg-gray-300 transition-colors text-sm sm:text-base"
          >
            Cancel
          </button>
          <button 
            onClick={() => {
              setShowModal(false);
              handleUploadAndGenerate();
            }}
            className="w-full sm:flex-1 bg-black text-white py-3 px-4 rounded-xl font-medium hover:bg-gray-800 transition-colors text-sm sm:text-base"
          >
            Generate
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="space-y-6">
            <div className="bg-white p-8 rounded-3xl shadow-lg border border-gray-100 bg-gradient-to-r from-indigo-50 to-purple-50">
              <h1 className="text-2xl font-bold text-gray-800 mb-2">Welcome back, Nimrod! ✨</h1>
              <p className="text-gray-600">
                Ready to boost your studies with AI-powered study tools?
              </p>
            </div>

            <div className="bg-white p-8 rounded-3xl shadow-lg border border-gray-100">
              <h2 className="font-bold text-lg mb-4 text-gray-800">🤖 AI Summarizer</h2>

              <div
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                  dragActive 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-300 bg-gray-50 hover:bg-gray-100 hover:border-gray-400'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => document.getElementById('fileInput').click()}
              >
                <input
                  id="fileInput"
                  type="file"
                  accept=".pdf,.ppt,.pptx"
                  onChange={handleFileInput}
                  className="hidden"
                  name='myFile'
                />
                
                <div className="mx-auto mb-4 h-12 w-12 text-gray-400 flex items-center justify-center text-2xl">📤</div>
                <p className="font-medium text-gray-700 mb-2">Upload Study Materials</p>
                <p className="text-sm text-gray-500">Drag & drop or click to upload PPT, PDF files (max 25MB each)</p>
              </div>

              {uploadedFiles.length > 0 && (
                <>
                  <TextExtractor 
                    file={uploadedFiles[0]} 
                    onTextExtracted={handleTextExtracted}
                  />
                  
                  <div className="mt-4 space-y-2">
                    <p className="text-sm font-medium text-gray-700">Uploaded File:</p>
                    {uploadedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-green-50 border border-green-200 p-3 rounded-xl">
                        <div className="flex items-center space-x-2">
                          {file.name.toLowerCase().includes('pdf') ? (
                            <span className="text-red-600">📄</span>
                          ) : (
                            <span className="text-orange-600">📊</span>
                          )}
                          <span className="text-sm font-medium text-gray-700 truncate">{file.name}</span>
                          <span className="text-xs text-gray-500">({(file.size / 1024 / 1024).toFixed(1)} MB)</span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFile(index);
                          }}
                          className="text-gray-400 hover:text-red-500 transition-colors text-lg"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>

                  {extractedContent && (
                    <div className="mt-4 bg-blue-50 border border-blue-200 p-4 rounded-xl">
                      <p className="text-sm font-medium text-gray-700 mb-2">Extraction Complete!</p>
                      <p className="text-xs text-gray-600">
                        {extractedContent.wordCount} words extracted from {extractedContent.source}
                      </p>
                      {extractedContent.slideCount && (
                        <p className="text-xs text-gray-600">
                          {extractedContent.slideCount} slides processed
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}

              {error && (
                <p className="text-red-500 text-sm mt-3 bg-red-50 p-3 rounded-xl border border-red-200">
                  {error}
                </p>
              )}

              <button
                type='button'
                onClick={handleGenerate}
                disabled={uploadedFiles.length === 0 || isExtracting || !extractedContent}
                className={`mt-6 w-full py-4 rounded-xl font-medium transition-all transform ${
                  uploadedFiles.length > 0 && !isExtracting && extractedContent
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 hover:scale-105 shadow-lg'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {isExtracting ? 'Extracting Text...' : 'Generate Summary ✨'}
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white p-8 rounded-3xl shadow-lg border border-gray-100">
              <h2 className="font-bold text-lg mb-4 text-gray-800">📅 Upcoming Deadlines</h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center bg-red-50 border border-red-200 p-4 rounded-xl">
                  <span className="font-medium text-gray-800">Capstone Defense</span>
                  <span className="text-red-600 font-medium bg-red-100 px-3 py-1 rounded-full text-sm">Due today</span>
                </div>
                <div className="flex justify-between items-center bg-blue-50 border border-blue-200 p-4 rounded-xl">
                  <span className="font-medium text-gray-800">Web Dev Quiz</span>
                  <span className="text-blue-600 font-medium bg-blue-100 px-3 py-1 rounded-full text-sm">Due in 2 weeks</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white p-8 rounded-3xl shadow-lg border border-gray-100 flex flex-col">
              <div className="border-2 border-gray-900 p-6 rounded-2xl mb-6 bg-gradient-to-b from-blue-50 to-purple-50">
                <div className="aspect-video bg-gradient-to-r from-pink-200 to-purple-200 rounded-xl mb-4 flex items-center justify-center overflow-hidden">
                  <img
                    src="https://placekitten.com/400/300"
                    alt="Buddy"
                    className="w-full h-full object-cover rounded-xl"
                  />
                </div>
                <div className="text-center">
                  <p className="font-bold text-lg">Buddy</p>
                  <p className="text-sm text-gray-600 bg-yellow-100 px-3 py-1 rounded-full inline-block">Level 1</p>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                {["Hunger", "Happiness", "Cleanliness", "Energy"].map((stat, index) => (
                  <div key={stat} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <p className="text-sm font-medium text-gray-700">{stat}</p>
                      <span className="text-xs text-gray-500">80%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className={`h-3 rounded-full transition-all duration-300 ${
                          index === 0 ? 'bg-gradient-to-r from-green-400 to-green-600' :
                          index === 1 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' :
                          index === 2 ? 'bg-gradient-to-r from-blue-400 to-blue-600' :
                          'bg-gradient-to-r from-purple-400 to-purple-600'
                        }`}
                        style={{ width: '80%' }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-3 mb-4">
                <button className="bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-3 rounded-xl font-medium hover:from-green-600 hover:to-green-700 transition-all transform hover:scale-105 shadow-lg">
                  Feed (6)
                </button>
                <button className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white px-4 py-3 rounded-xl font-medium hover:from-yellow-600 hover:to-yellow-700 transition-all transform hover:scale-105 shadow-lg">
                  Play (2)
                </button>
                <button className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-3 rounded-xl font-medium hover:from-blue-600 hover:to-blue-700 transition-all transform hover:scale-105 shadow-lg">
                  Clean (5)
                </button>
              </div>

              <div className="flex gap-3">
                <button className="flex-1 bg-gradient-to-r from-purple-500 to-purple-600 text-white px-6 py-3 rounded-xl font-medium hover:from-purple-600 hover:to-purple-700 transition-all transform hover:scale-105 shadow-lg">
                  Shop
                </button>
                <button className="flex-1 bg-gradient-to-r from-pink-500 to-pink-600 text-white px-6 py-3 rounded-xl font-medium hover:from-pink-600 hover:to-pink-700 transition-all transform hover:scale-105 shadow-lg">
                  Clothes
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      {showModal && <GenerateModal />}
    </div>
  );
}