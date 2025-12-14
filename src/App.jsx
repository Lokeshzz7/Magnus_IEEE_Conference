import React, { useState, useEffect } from 'react';
import { FileText, Download, Upload, LogOut, Eye, User, Calendar, BookOpen, Loader2 } from 'lucide-react';

const GITHUB_CONFIG = {
  owner: 'Lokeshzz7',
  repo: 'Magnus_ConferencePapers',
  token: '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', 
  branch: 'main'
};

// Admin credentials - CHANGE THESE
const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: 'admin@123'
};


const App = () => {
  const [currentPage, setCurrentPage] = useState('home');
  const [papers, setPapers] = useState([]);
  const [selectedPaper, setSelectedPaper] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchPapers();
  }, []);

  const fetchPapers = async () => {
    try {
      const response = await fetch(
        `https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/papers.json?ref=${GITHUB_CONFIG.branch}`,
        {
          headers: {
            Authorization: `token ${GITHUB_CONFIG.token}`,
            Accept: 'application/vnd.github.v3+json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        // Fix for special characters when reading
        const decodedContent = decodeURIComponent(escape(atob(data.content)));
        const content = JSON.parse(decodedContent);
        setPapers(content.papers || []);
      } else {
        setPapers([]);
      }
    } catch (error) {
      console.error('Error fetching papers:', error);
      setPapers([]);
    }
  };

  const uploadToGitHub = async (filename, content, message) => {
    const url = `https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${filename}`;
    
    try {
      let sha;
      const checkResponse = await fetch(url, {
        headers: {
          Authorization: `token ${GITHUB_CONFIG.token}`,
          Accept: 'application/vnd.github.v3+json'
        }
      });

      if (checkResponse.ok) {
        const existingFile = await checkResponse.json();
        sha = existingFile.sha;
      }

      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          Authorization: `token ${GITHUB_CONFIG.token}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message,
          content,
          sha,
          branch: GITHUB_CONFIG.branch
        })
      });

      return response.ok;
    } catch (error) {
      console.error('Upload error:', error);
      return false;
    }
  };

  const handleLogin = (username, password) => {
    if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
      setIsAuthenticated(true);
      setCurrentPage('upload');
      return true;
    }
    return false;
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentPage('home');
  };

  const handleUploadPaper = async (paperData, pdfFile) => {
    setLoading(true);
    console.log('🚀 Starting upload process...');
    
    try {
      setUploadProgress('Reading PDF file...');
      console.log('📖 Reading PDF file...');
      
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64PDF = reader.result.split(',')[1];
        const pdfFilename = `pdfs/${Date.now()}_${pdfFile.name}`;
        
        setUploadProgress('Uploading PDF to GitHub... (This may take a minute)');
        console.log('⬆️ Uploading PDF to GitHub...');
        
        const pdfUploaded = await uploadToGitHub(
          pdfFilename,
          base64PDF,
          `Upload paper: ${paperData.title}`
        );

        if (pdfUploaded) {
          console.log('✅ PDF uploaded successfully!');
          const newPaper = {
            id: Date.now().toString(),
            ...paperData,
            pdfUrl: `https://github.com/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/raw/${GITHUB_CONFIG.branch}/${pdfFilename}`,
            uploadDate: new Date().toISOString()
          };

          const updatedPapers = [...papers, newPaper];
          
          // Fix for special characters - encode to base64 properly
          const jsonString = JSON.stringify({ papers: updatedPapers }, null, 2);
          const papersContent = btoa(unescape(encodeURIComponent(jsonString)));

          setUploadProgress('Updating paper metadata...');
          console.log('📝 Updating metadata...');
          
          const metadataUploaded = await uploadToGitHub(
            'papers.json',
            papersContent,
            `Add paper metadata: ${paperData.title}`
          );

          if (metadataUploaded) {
            console.log('✅ Upload complete!');
            setPapers(updatedPapers);
            setUploadProgress('Upload complete! ✨');
            alert('Paper uploaded successfully! 🎉');
            setLoading(false);
            setCurrentPage('home');
          } else {
            console.error('❌ Failed to update metadata');
            alert('Failed to update metadata');
            setLoading(false);
          }
        } else {
          console.error('❌ Failed to upload PDF');
          alert('Failed to upload PDF');
          setLoading(false);
        }
      };
      reader.readAsDataURL(pdfFile);
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed: ' + error.message);
      setLoading(false);
    }
  };

  const filteredPapers = papers.filter(paper =>
    paper.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    paper.authors.toLowerCase().includes(searchQuery.toLowerCase()) ||
    paper.abstract.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {loading && <LoadingOverlay progress={uploadProgress} />}
      
      <nav className="bg-white shadow-lg sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setCurrentPage('home')}>
              <BookOpen className="w-8 h-8 text-blue-600" />
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                IEEE Symposium
              </span>
            </div>
            <div className="flex items-center space-x-4">
              {isAuthenticated ? (
                <>
                  <button
                    onClick={() => setCurrentPage('upload')}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Upload Paper</span>
                  </button>
                  <button
                    onClick={handleLogout}
                    className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setCurrentPage('login')}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  <User className="w-4 h-4" />
                  <span>Admin Login</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentPage === 'home' && <HomePage papers={filteredPapers} setSelectedPaper={setSelectedPaper} setCurrentPage={setCurrentPage} searchQuery={searchQuery} setSearchQuery={setSearchQuery} />}
        {currentPage === 'paper' && <PaperPage paper={selectedPaper} setCurrentPage={setCurrentPage} />}
        {currentPage === 'login' && <LoginPage handleLogin={handleLogin} />}
        {currentPage === 'upload' && <UploadPage handleUploadPaper={handleUploadPaper} loading={loading} />}
      </main>
    </div>
  );
};

const LoadingOverlay = ({ progress }) => (
  <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 backdrop-blur-sm">
    <div className="bg-white rounded-3xl p-10 max-w-md w-full mx-4 shadow-2xl transform scale-100 animate-pulse">
      <div className="flex flex-col items-center space-y-6">
        <div className="relative">
          <div className="animate-spin rounded-full h-24 w-24 border-t-4 border-b-4 border-blue-600"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
          </div>
        </div>
        <div className="text-center space-y-2">
          <h3 className="text-3xl font-bold text-gray-900">Uploading Paper</h3>
          <p className="text-lg text-gray-600 font-medium">{progress}</p>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden shadow-inner">
          <div className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 h-4 rounded-full animate-pulse"></div>
        </div>
        <div className="flex items-center space-x-2 text-gray-500">
          <div className="animate-bounce">⏳</div>
          <p className="text-sm">Please wait, uploading to GitHub...</p>
        </div>
      </div>
    </div>
  </div>
);

const HomePage = ({ papers, setSelectedPaper, setCurrentPage, searchQuery, setSearchQuery }) => (
  <div className="space-y-8">
    <div className="text-center space-y-4">
      <h1 className="text-5xl font-bold text-gray-900">Conference Papers</h1>
      <p className="text-xl text-gray-600">Explore cutting-edge research and innovations</p>
      <div className="max-w-2xl mx-auto">
        <input
          type="text"
          placeholder="Search papers by title, author, or keywords..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-6 py-4 text-lg border-2 border-gray-300 rounded-full focus:border-blue-500 focus:outline-none shadow-lg"
        />
      </div>
    </div>

    {papers.length === 0 ? (
      <div className="text-center py-20">
        <FileText className="w-20 h-20 text-gray-300 mx-auto mb-4" />
        <p className="text-xl text-gray-500">No papers uploaded yet</p>
      </div>
    ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {papers.map((paper) => (
          <div
            key={paper.id}
            onClick={() => {
              setSelectedPaper(paper);
              setCurrentPage('paper');
            }}
            className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer overflow-hidden border border-gray-100 hover:scale-105"
          >
            <div className="bg-gradient-to-r from-blue-500 to-purple-500 h-2"></div>
            <div className="p-6 space-y-4">
              <h3 className="text-xl font-bold text-gray-900 line-clamp-2 hover:text-blue-600 transition">
                {paper.title}
              </h3>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <User className="w-4 h-4" />
                <span className="line-clamp-1">{paper.authors}</span>
              </div>
              <p className="text-gray-600 line-clamp-3 text-sm leading-relaxed">
                {paper.abstract}
              </p>
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex items-center space-x-2 text-xs text-gray-500">
                  <Calendar className="w-4 h-4" />
                  <span>{new Date(paper.uploadDate).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center space-x-2 text-blue-600 font-semibold">
                  <Eye className="w-4 h-4" />
                  <span>Read Paper</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

const PaperPage = ({ paper, setCurrentPage }) => (
  <div className="max-w-5xl mx-auto">
    <button
      onClick={() => setCurrentPage('home')}
      className="mb-6 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
    >
      ← Back to Papers
    </button>

    <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-8 text-white">
        <h1 className="text-4xl font-bold mb-4">{paper.title}</h1>
        <div className="flex items-center space-x-2 text-blue-100">
          <User className="w-5 h-5" />
          <span className="text-lg">{paper.authors}</span>
        </div>
        <div className="flex items-center space-x-2 text-blue-100 mt-2">
          <Calendar className="w-5 h-5" />
          <span>Uploaded: {new Date(paper.uploadDate).toLocaleDateString()}</span>
        </div>
      </div>

      <div className="p-8 space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Abstract</h2>
          <p className="text-gray-700 leading-relaxed text-lg">{paper.abstract}</p>
        </div>

        <div className="flex space-x-4">
          <a
            href={paper.pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center space-x-2 px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-lg"
          >
            <Eye className="w-5 h-5" />
            <span className="font-semibold">Open in New Tab</span>
          </a>
          <a
            href={paper.pdfUrl}
            download
            className="flex-1 flex items-center justify-center space-x-2 px-6 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition shadow-lg"
          >
            <Download className="w-5 h-5" />
            <span className="font-semibold">Download PDF</span>
          </a>
        </div>

        <div className="mt-8 border-t pt-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">📄 Read Paper Below</h2>
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 shadow-inner">
            <iframe
              src={`https://docs.google.com/viewer?url=${encodeURIComponent(paper.pdfUrl)}&embedded=true`}
              className="w-full h-[900px] border-4 border-white rounded-lg shadow-2xl bg-white"
              title="PDF Viewer"
            />
          </div>
          <p className="text-sm text-gray-500 mt-4 text-center bg-yellow-50 p-3 rounded-lg border border-yellow-200">
            💡 <strong>Tip:</strong> If PDF doesn't display here, click "Open in New Tab" button above to view it separately
          </p>
        </div>
      </div>
    </div>
  </div>
);

const LoginPage = ({ handleLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const onSubmit = () => {
    if (handleLogin(username, password)) {
      setError('');
    } else {
      setError('Invalid credentials');
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20">
      <div className="bg-white rounded-xl shadow-2xl p-8">
        <div className="text-center mb-8">
          <div className="inline-block p-4 bg-blue-100 rounded-full mb-4">
            <User className="w-12 h-12 text-blue-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900">Admin Login</h2>
          <p className="text-gray-600 mt-2">Access the upload panel</p>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && onSubmit()}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && onSubmit()}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <button
            onClick={onSubmit}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition font-semibold shadow-lg"
          >
            Login
          </button>
        </div>
      </div>
    </div>
  );
};

const UploadPage = ({ handleUploadPaper, loading }) => {
  const [title, setTitle] = useState('');
  const [authors, setAuthors] = useState('');
  const [abstract, setAbstract] = useState('');
  const [pdfFile, setPdfFile] = useState(null);

  const onSubmit = () => {
    if (!title || !authors || !abstract || !pdfFile) {
      alert('Please fill all fields and select a PDF file');
      return;
    }
    console.log('🎯 Form submitted, starting upload...');
    handleUploadPaper({ title, authors, abstract }, pdfFile);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white rounded-xl shadow-2xl p-8">
        <div className="text-center mb-8">
          <div className="inline-block p-4 bg-blue-100 rounded-full mb-4">
            <Upload className="w-12 h-12 text-blue-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900">Upload New Paper</h2>
          <p className="text-gray-600 mt-2">Add a conference paper to the repository</p>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Paper Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={loading}
              placeholder="Enter the full paper title"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Authors *</label>
            <input
              type="text"
              value={authors}
              onChange={(e) => setAuthors(e.target.value)}
              placeholder="John Doe, Jane Smith, et al."
              disabled={loading}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Abstract *</label>
            <textarea
              value={abstract}
              onChange={(e) => setAbstract(e.target.value)}
              rows={6}
              disabled={loading}
              placeholder="Enter the paper abstract..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">PDF File *</label>
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => setPdfFile(e.target.files[0])}
              disabled={loading}
              className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed hover:border-blue-400 transition"
            />
            {pdfFile && (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-700 font-medium flex items-center space-x-2">
                  <span>✅</span>
                  <span>Selected: {pdfFile.name}</span>
                  <span className="text-green-600">({(pdfFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                </p>
              </div>
            )}
          </div>

          <button
            onClick={onSubmit}
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-lg hover:from-blue-700 hover:to-purple-700 transition font-semibold shadow-lg disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-lg"
          >
            {loading ? '⏳ Uploading...' : '🚀 Upload Paper'}
          </button>
          
          {loading && (
            <div className="text-center text-sm text-gray-500 animate-pulse">
              Do not close this window while uploading...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;