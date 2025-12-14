import React, { useState, useEffect } from 'react';
import { FileText, Download, Upload, LogOut, Eye, User, Calendar, BookOpen, Loader2 } from 'lucide-react';

const GITHUB_CONFIG = {
  owner: import.meta.env.VITE_GITHUB_OWNER,
  repo: import.meta.env.VITE_GITHUB_REPO,
  token: import.meta.env.VITE_GITHUB_TOKEN, 
  branch: import.meta.env.VITE_GITHUB_BRANCH || 'main'
};

const ADMIN_CREDENTIALS = {
  username: import.meta.env.VITE_ADMIN_USERNAME || 'admin',
  password: import.meta.env.VITE_ADMIN_PASSWORD || 'admin@123'
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
        { headers: { Authorization: `token ${GITHUB_CONFIG.token}`, Accept: 'application/vnd.github.v3+json' } }
      );
      if (response.ok) {
        const data = await response.json();
        const content = JSON.parse(decodeURIComponent(escape(atob(data.content))));
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
      const checkResponse = await fetch(url, { headers: { Authorization: `token ${GITHUB_CONFIG.token}`, Accept: 'application/vnd.github.v3+json' } });
      if (checkResponse.ok) {
        const existingFile = await checkResponse.json();
        sha = existingFile.sha;
      }
      const response = await fetch(url, {
        method: 'PUT',
        headers: { Authorization: `token ${GITHUB_CONFIG.token}`, Accept: 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, content, sha, branch: GITHUB_CONFIG.branch })
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

  const handleDeletePaper = async (paperId) => {
    if (!window.confirm('Are you sure you want to delete this paper? This action cannot be undone.')) return;
    setLoading(true);
    try {
      const paperToDelete = papers.find(p => p.id === paperId);
      if (!paperToDelete) { alert('Paper not found'); setLoading(false); return; }
      const updatedPapers = papers.filter(p => p.id !== paperId);
      const papersContent = btoa(unescape(encodeURIComponent(JSON.stringify({ papers: updatedPapers }, null, 2))));
      const metadataUpdated = await uploadToGitHub('papers.json', papersContent, `Delete paper: ${paperToDelete.title}`);
      if (metadataUpdated) {
        setPapers(updatedPapers);
        alert('Paper deleted successfully!');
        setCurrentPage('home');
      } else {
        alert('Failed to delete paper');
      }
    } catch (error) {
      alert('Delete failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadPaper = async (paperData, pdfFile) => {
    setLoading(true);
    setUploadProgress('Reading PDF file...');
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64PDF = reader.result.split(',')[1];
        const pdfFilename = `pdfs/${Date.now()}_${pdfFile.name}`;
        setUploadProgress('Uploading PDF to GitHub...');
        const pdfUploaded = await uploadToGitHub(pdfFilename, base64PDF, `Upload paper: ${paperData.title}`);
        if (pdfUploaded) {
          const newPaper = {
            id: Date.now().toString(),
            ...paperData,
            pdfUrl: `https://github.com/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/raw/${GITHUB_CONFIG.branch}/${pdfFilename}`,
            uploadDate: new Date().toISOString()
          };
          const updatedPapers = [...papers, newPaper];
          const papersContent = btoa(unescape(encodeURIComponent(JSON.stringify({ papers: updatedPapers }, null, 2))));
          setUploadProgress('Updating metadata...');
          const metadataUploaded = await uploadToGitHub('papers.json', papersContent, `Add paper: ${paperData.title}`);
          if (metadataUploaded) {
            setPapers(updatedPapers);
            alert('Paper uploaded successfully!');
            setCurrentPage('home');
          } else {
            alert('Failed to update metadata');
          }
        } else {
          alert('Failed to upload PDF');
        }
        setLoading(false);
      };
      reader.readAsDataURL(pdfFile);
    } catch (error) {
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
    <div className="min-h-screen bg-gray-50">
      {loading && <LoadingOverlay progress={uploadProgress} />}
      <nav className="bg-white shadow-sm sticky top-0 z-40 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setCurrentPage('home')}>
              <BookOpen className="w-6 h-6 text-gray-900" />
              <span className="text-xl font-semibold text-gray-900">IEEE Symposium</span>
            </div>
            <div className="flex items-center space-x-3">
              {isAuthenticated ? (
                <>
                  <button onClick={() => setCurrentPage('upload')} className="flex items-center space-x-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition text-sm font-medium">
                    <Upload className="w-4 h-4" /><span>Upload</span>
                  </button>
                  <button onClick={handleLogout} className="flex items-center space-x-2 px-4 py-2 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition border border-gray-300 text-sm font-medium">
                    <LogOut className="w-4 h-4" /><span>Logout</span>
                  </button>
                </>
              ) : (
                <button onClick={() => setCurrentPage('login')} className="flex items-center space-x-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition text-sm font-medium">
                  <User className="w-4 h-4" /><span>Admin</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentPage === 'home' && <HomePage papers={filteredPapers} setSelectedPaper={setSelectedPaper} setCurrentPage={setCurrentPage} searchQuery={searchQuery} setSearchQuery={setSearchQuery} isAuthenticated={isAuthenticated} handleDeletePaper={handleDeletePaper} />}
        {currentPage === 'paper' && <PaperPage paper={selectedPaper} setCurrentPage={setCurrentPage} isAuthenticated={isAuthenticated} handleDeletePaper={handleDeletePaper} />}
        {currentPage === 'login' && <LoginPage handleLogin={handleLogin} />}
        {currentPage === 'upload' && <UploadPage handleUploadPaper={handleUploadPaper} loading={loading} />}
      </main>
    </div>
  );
};

const LoadingOverlay = ({ progress }) => (
  <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
    <div className="bg-white rounded-3xl p-10 max-w-md w-full mx-4 shadow-2xl">
      <div className="flex flex-col items-center space-y-6">
        <div className="relative">
          <div className="animate-spin rounded-full h-24 w-24 border-t-4 border-b-4 border-blue-600"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
          </div>
        </div>
        <h3 className="text-3xl font-bold text-gray-900">Uploading</h3>
        <p className="text-lg text-gray-600 font-medium">{progress}</p>
        <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 h-4 rounded-full animate-pulse"></div>
        </div>
      </div>
    </div>
  </div>
);

const HomePage = ({ papers, setSelectedPaper, setCurrentPage, searchQuery, setSearchQuery, isAuthenticated, handleDeletePaper }) => (
  <div className="space-y-8">
    <div className="text-center space-y-4 py-8">
      <h1 className="text-4xl font-bold text-gray-900">Research Papers</h1>
      <p className="text-lg text-gray-600 max-w-2xl mx-auto">Browse and explore our collection of conference papers</p>
      <div className="max-w-2xl mx-auto mt-6">
        <input type="text" placeholder="Search by title, author, or keyword..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full px-5 py-3 text-base border border-gray-300 rounded-lg focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-opacity-20 shadow-sm" />
      </div>
    </div>
    {papers.length === 0 ? (
      <div className="text-center py-20">
        <div className="inline-block p-6 bg-gray-50 rounded-full mb-4"><FileText className="w-16 h-16 text-gray-400" /></div>
        <p className="text-lg text-gray-500">No papers available</p>
      </div>
    ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {papers.map((paper) => (
          <div key={paper.id} onClick={() => { setSelectedPaper(paper); setCurrentPage('paper'); }} className="bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer overflow-hidden border border-gray-200 hover:border-gray-300 group relative">
            {isAuthenticated && (
              <button onClick={(e) => { e.stopPropagation(); handleDeletePaper(paper.id); }} className="absolute top-3 right-3 p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition z-10 opacity-0 group-hover:opacity-100" title="Delete paper">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            )}
            <div className="p-6 space-y-3">
              <h3 className="text-lg font-semibold text-gray-900 line-clamp-2 group-hover:text-gray-700 transition">{paper.title}</h3>
              <div className="flex items-center space-x-2 text-sm text-gray-600"><User className="w-4 h-4" /><span className="line-clamp-1">{paper.authors}</span></div>
              <p className="text-gray-600 line-clamp-3 text-sm leading-relaxed">{paper.abstract}</p>
              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <div className="flex items-center space-x-2 text-xs text-gray-500"><Calendar className="w-4 h-4" /><span>{new Date(paper.uploadDate).toLocaleDateString()}</span></div>
                <div className="flex items-center space-x-1 text-gray-900 font-medium text-sm group-hover:text-gray-700"><span>Read</span><span>→</span></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

const PaperPage = ({ paper, setCurrentPage, isAuthenticated, handleDeletePaper }) => (
  <div className="min-h-screen bg-gray-50 -mt-8 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-6">
    <div className="max-w-[1800px] mx-auto">
      <div className="flex justify-between items-center mb-4">
        <button onClick={() => setCurrentPage('home')} className="px-4 py-2 bg-white text-gray-700 rounded-lg hover:bg-gray-100 transition border border-gray-200 shadow-sm flex items-center space-x-2"><span>←</span><span>Back</span></button>
        {isAuthenticated && (
          <button onClick={() => handleDeletePaper(paper.id)} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition shadow-sm flex items-center space-x-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            <span>Delete</span>
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 h-[calc(100vh-120px)]">
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 overflow-y-auto">
          <div className="p-8 space-y-6">
            <div className="border-b border-gray-200 pb-6">
              <h1 className="text-3xl font-semibold text-gray-900 leading-tight mb-4">{paper.title}</h1>
              <div className="flex items-center space-x-2 text-gray-600"><User className="w-4 h-4" /><span className="text-sm font-medium">{paper.authors}</span></div>
              <div className="flex items-center space-x-2 text-gray-500 mt-2"><Calendar className="w-4 h-4" /><span className="text-sm">Published: {new Date(paper.uploadDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span></div>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Abstract</h2>
              <p className="text-gray-700 leading-relaxed text-justify">{paper.abstract}</p>
            </div>
            <div className="space-y-3 pt-4">
              <a href={paper.pdfUrl} download className="w-full flex items-center justify-center space-x-2 px-5 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition shadow-sm font-medium"><Download className="w-5 h-5" /><span>Download PDF</span></a>
              <a href={paper.pdfUrl} target="_blank" rel="noopener noreferrer" className="w-full flex items-center justify-center space-x-2 px-5 py-3 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition border border-gray-300 font-medium"><Eye className="w-5 h-5" /><span>Open in New Tab</span></a>
            </div>
          </div>
        </div>
        <div className="lg:col-span-3 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col">
          <div className="bg-gray-50 border-b border-gray-200 px-6 py-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Document Viewer</h2>
            <div className="flex items-center space-x-2 text-xs text-gray-500"><FileText className="w-4 h-4" /><span>PDF</span></div>
          </div>
          <div className="flex-1 bg-gray-100 p-4">
            <iframe src={`https://docs.google.com/viewer?url=${encodeURIComponent(paper.pdfUrl)}&embedded=true`} className="w-full h-full rounded border border-gray-300 bg-white shadow-inner" title="PDF Viewer" />
          </div>
        </div>
      </div>
    </div>
  </div>
);

const LoginPage = ({ handleLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const onSubmit = () => { if (handleLogin(username, password)) { setError(''); } else { setError('Invalid credentials'); } };
  return (
    <div className="max-w-md mx-auto mt-20">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="text-center mb-8">
          <div className="inline-block p-4 bg-gray-100 rounded-full mb-4"><User className="w-10 h-10 text-gray-900" /></div>
          <h2 className="text-2xl font-semibold text-gray-900">Admin Access</h2>
          <p className="text-gray-600 mt-2 text-sm">Sign in to manage papers</p>
        </div>
        <div className="space-y-5">
          <div><label className="block text-sm font-medium text-gray-700 mb-2">Username</label><input type="text" value={username} onChange={(e) => setUsername(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && onSubmit()} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-2">Password</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && onSubmit()} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm" /></div>
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}
          <button onClick={onSubmit} className="w-full bg-gray-900 text-white py-2.5 rounded-lg hover:bg-gray-800 transition font-medium shadow-sm text-sm">Sign In</button>
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
  const onSubmit = () => { if (!title || !authors || !abstract || !pdfFile) { alert('Please fill all fields'); return; } handleUploadPaper({ title, authors, abstract }, pdfFile); };
  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="text-center mb-8">
          <div className="inline-block p-4 bg-gray-100 rounded-full mb-4"><Upload className="w-10 h-10 text-gray-900" /></div>
          <h2 className="text-2xl font-semibold text-gray-900">Upload Paper</h2>
        </div>
        <div className="space-y-5">
          <div><label className="block text-sm font-medium text-gray-700 mb-2">Paper Title *</label><input type="text" value={title} onChange={(e) => setTitle(e.target.value)} disabled={loading} placeholder="Enter title" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-50 text-sm" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-2">Authors *</label><input type="text" value={authors} onChange={(e) => setAuthors(e.target.value)} disabled={loading} placeholder="John Doe, Jane Smith" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-50 text-sm" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-2">Abstract *</label><textarea value={abstract} onChange={(e) => setAbstract(e.target.value)} rows={6} disabled={loading} placeholder="Enter abstract" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-50 text-sm" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-2">PDF File *</label><input type="file" accept=".pdf" onChange={(e) => setPdfFile(e.target.files[0])} disabled={loading} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:bg-gray-100 file:text-gray-700" />{pdfFile && <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg"><p className="text-sm text-green-700 font-medium">✓ {pdfFile.name} ({(pdfFile.size / 1024 / 1024).toFixed(2)} MB)</p></div>}</div>
          <button onClick={onSubmit} disabled={loading} className="w-full bg-gray-900 text-white py-3 rounded-lg hover:bg-gray-800 transition font-medium shadow-sm disabled:bg-gray-400">{loading ? 'Uploading...' : 'Upload Paper'}</button>
        </div>
      </div>
    </div>
  );
};

export default App;