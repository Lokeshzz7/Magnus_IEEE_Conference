import React, { useState, useEffect } from 'react';
import { FileText, Download, Upload, LogOut, Eye, User, Calendar, BookOpen } from 'lucide-react';

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
        const content = JSON.parse(atob(data.content));
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
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64PDF = reader.result.split(',')[1];
        const pdfFilename = `pdfs/${Date.now()}_${pdfFile.name}`;
        
        const pdfUploaded = await uploadToGitHub(
          pdfFilename,
          base64PDF,
          `Upload paper: ${paperData.title}`
        );

        if (pdfUploaded) {
          const newPaper = {
            id: Date.now().toString(),
            ...paperData,
            pdfUrl: `https://raw.githubusercontent.com/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/${GITHUB_CONFIG.branch}/${pdfFilename}`,
            uploadDate: new Date().toISOString()
          };

          const updatedPapers = [...papers, newPaper];
          const papersContent = btoa(JSON.stringify({ papers: updatedPapers }, null, 2));

          const metadataUploaded = await uploadToGitHub(
            'papers.json',
            papersContent,
            `Add paper metadata: ${paperData.title}`
          );

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
      };
      reader.readAsDataURL(pdfFile);
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed: ' + error.message);
    } finally {
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
      <nav className="bg-white shadow-lg sticky top-0 z-50">
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
                  <span>View Paper</span>
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
            <span className="font-semibold">View Paper</span>
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
          <iframe
            src={paper.pdfUrl}
            className="w-full h-[800px] border-2 border-gray-200 rounded-lg"
            title="PDF Viewer"
          />
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
      alert('Please fill all fields');
      return;
    }
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
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Authors *</label>
            <input
              type="text"
              value={authors}
              onChange={(e) => setAuthors(e.target.value)}
              placeholder="John Doe, Jane Smith, et al."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Abstract *</label>
            <textarea
              value={abstract}
              onChange={(e) => setAbstract(e.target.value)}
              rows={6}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">PDF File *</label>
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => setPdfFile(e.target.files[0])}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <button
            onClick={onSubmit}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-4 rounded-lg hover:bg-blue-700 transition font-semibold shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Uploading...' : 'Upload Paper'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;