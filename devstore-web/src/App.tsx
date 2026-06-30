import React, { useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';

interface AppItem {
  id: string;
  name: string;
  packageName: string;
  version: string;
  description: string;
  size: string;
  filename: string;
  createdAt: string;
  category?: 'app' | 'game';
  downloads?: string;
  rating?: number;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'app' | 'game' | 'publish'>('app');
  const [searchQuery, setSearchQuery] = useState('');
  const [apps, setApps] = useState<AppItem[]>([]);
  const [selectedApp, setSelectedApp] = useState<AppItem | null>(null);
  
  // Publish Form State
  const [appName, setAppName] = useState('');
  const [appVersion, setAppVersion] = useState('1.0.0');
  const [appPkg, setAppPkg] = useState('');
  const [appDesc, setAppDesc] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // Fetch apps from backend on mount
  const fetchApps = async () => {
    try {
      const response = await fetch('/api/apks');
      if (response.ok) {
        const data = await response.json();
        // Add categories and mock downloads/ratings to make it look premium
        const populated = data.map((item: any, index: number) => ({
          ...item,
          category: index % 2 === 0 ? 'app' : 'game',
          downloads: `${100 + (index * 42)}+`,
          rating: (4.2 + (index * 0.1) % 0.8).toFixed(1),
        }));
        setApps(populated);
      }
    } catch (err) {
      console.warn('Erreur lors du chargement des applications:', err);
    }
  };

  useEffect(() => {
    fetchApps();
  }, []);

  // Filter apps based on active tab and search query
  const filteredApps = apps.filter(app => {
    const matchesTab = app.category === activeTab;
    const matchesSearch = app.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          app.packageName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  // Dropzone for APK
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/vnd.android.package-archive': ['.apk']
    },
    maxFiles: 1,
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        setSelectedFile(file);
        
        // Auto-guess app name and package name from file name
        const cleanName = file.name.replace('.apk', '').replace(/[-_]/g, ' ');
        setAppName(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
        const guessedPkg = 'com.devstore.' + file.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        setAppPkg(guessedPkg);
        setUploadError(null);
      }
    }
  });

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !appName || !appVersion) {
      setUploadError('Veuillez remplir tous les champs obligatoires.');
      return;
    }

    setUploadProgress(0);
    setUploadError(null);
    setUploadSuccess(false);

    const formData = new FormData();
    formData.append('apk', selectedFile);
    formData.append('name', appName);
    formData.append('version', appVersion);
    formData.append('packageName', appPkg);
    formData.append('description', appDesc);

    try {
      // Direct XMLHttp request to track progress bar
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/apks/upload', true);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(progress);
        }
      };

      xhr.onload = () => {
        if (xhr.status === 201) {
          setUploadProgress(null);
          setUploadSuccess(true);
          setAppName('');
          setAppVersion('1.0.0');
          setAppPkg('');
          setAppDesc('');
          setSelectedFile(null);
          fetchApps(); // Reload list
        } else {
          try {
            const errData = JSON.parse(xhr.responseText);
            setUploadError(errData.error || 'Erreur lors du téléversement.');
          } catch {
            setUploadError('Erreur serveur lors de la publication.');
          }
          setUploadProgress(null);
        }
      };

      xhr.onerror = () => {
        setUploadError('Erreur réseau.');
        setUploadProgress(null);
      };

      xhr.send(formData);
    } catch (err) {
      setUploadError('Erreur lors de la publication.');
      setUploadProgress(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Search Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl text-emerald-600 font-bold tracking-tight">Dev Store</span>
        </div>
        
        <div className="flex-1 max-w-md mx-6 relative">
          <span className="material-symbols-outlined absolute left-3 top-2.5 text-gray-400">search</span>
          <input
            type="text"
            placeholder="Rechercher des applications ou des jeux..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-100 text-gray-800 placeholder-gray-500 pl-10 pr-4 py-2 rounded-full border border-transparent focus:outline-none focus:bg-white focus:border-emerald-600 transition-all text-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-gray-700 cursor-pointer hover:bg-gray-100 p-2 rounded-full">account_circle</span>
        </div>
      </header>

      {/* Tabs */}
      <nav className="flex justify-center border-b border-gray-100 bg-white sticky top-[61px] z-30">
        <button
          onClick={() => { setActiveTab('app'); setSelectedApp(null); }}
          className={`flex items-center gap-2 px-6 py-3.5 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'app' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <span className="material-symbols-outlined text-[19px]">apps</span>
          Applications
        </button>
        <button
          onClick={() => { setActiveTab('game'); setSelectedApp(null); }}
          className={`flex items-center gap-2 px-6 py-3.5 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'game' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <span className="material-symbols-outlined text-[19px]">sports_esports</span>
          Jeux
        </button>
        <button
          onClick={() => { setActiveTab('publish'); setSelectedApp(null); }}
          className={`flex items-center gap-2 px-6 py-3.5 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'publish' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <span className="material-symbols-outlined text-[19px]">cloud_upload</span>
          Publier
        </button>
      </nav>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">
        {activeTab !== 'publish' ? (
          <div>
            {/* Category Banner Title */}
            <h2 className="text-xl font-bold text-gray-900 mb-6 font-sans">
              {activeTab === 'app' ? 'Applications recommandées' : 'Jeux du moment'}
            </h2>

            {/* Filtered Apps Grid */}
            {filteredApps.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {filteredApps.map((app) => (
                  <div
                    key={app.id}
                    onClick={() => setSelectedApp(app)}
                    className="group flex flex-col items-center text-center cursor-pointer"
                  >
                    <div className="w-24 h-24 bg-gradient-to-tr from-emerald-50 to-emerald-100 rounded-google border border-gray-100 flex items-center justify-center shadow-subtle group-hover:shadow-premium group-hover:scale-105 transition-all duration-300">
                      <span className="material-symbols-outlined text-4xl text-emerald-600">apk_install</span>
                    </div>
                    <span className="mt-3 text-sm font-semibold text-gray-900 truncate w-full px-2">{app.name}</span>
                    <span className="text-xs text-gray-500 truncate w-full px-2">{app.packageName}</span>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-xs font-semibold text-gray-700">{app.rating || '4.5'}</span>
                      <span className="material-symbols-outlined text-amber-400 text-xs fill-amber-400">star</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <span className="material-symbols-outlined text-5xl text-gray-300 mb-3">search_off</span>
                <p className="text-gray-500 font-semibold">Aucune application trouvée.</p>
                <p className="text-xs text-gray-400 mt-1">Publiez le premier APK de votre projet dans l'onglet "Publier" !</p>
              </div>
            )}
          </div>
        ) : (
          /* Developer Upload Console */
          <div className="max-w-2xl mx-auto bg-white border border-gray-100 rounded-google-lg p-6 md:p-8 shadow-subtle">
            <h2 className="text-2xl font-bold text-gray-900 mb-2 font-sans flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-600 text-3xl">publish</span>
              Console Développeur
            </h2>
            <p className="text-sm text-gray-500 mb-6">Hébergez vos fichiers APK directement sur Render pour permettre le téléchargement immédiat par les utilisateurs.</p>

            {uploadSuccess && (
              <div className="mb-6 bg-emerald-50 border border-emerald-100 text-emerald-800 p-4 rounded-google flex items-center gap-3">
                <span className="material-symbols-outlined text-emerald-600">check_circle</span>
                <div>
                  <h4 className="font-bold">Application publiée avec succès !</h4>
                  <p className="text-xs text-emerald-700">Elle est maintenant disponible en téléchargement dans les listes.</p>
                </div>
              </div>
            )}

            {uploadError && (
              <div className="mb-6 bg-rose-50 border border-rose-100 text-rose-800 p-4 rounded-google flex items-center gap-3">
                <span className="material-symbols-outlined text-rose-600">error</span>
                <div>
                  <h4 className="font-bold">Échec du téléversement</h4>
                  <p className="text-xs text-rose-700">{uploadError}</p>
                </div>
              </div>
            )}

            <form onSubmit={handlePublish} className="space-y-5">
              {/* Drag & Drop Zone */}
              <div {...getRootProps()} className={`border-2 border-dashed rounded-google p-8 text-center cursor-pointer transition-all ${
                isDragActive ? 'border-emerald-600 bg-emerald-50' : 'border-gray-200 hover:border-gray-300 bg-gray-50'
              }`}>
                <input {...getInputProps()} />
                <span className="material-symbols-outlined text-4xl text-gray-400 mb-2">upload_file</span>
                {selectedFile ? (
                  <div>
                    <p className="text-sm font-bold text-emerald-600 truncate">{selectedFile.name}</p>
                    <p className="text-xs text-gray-500 mt-1">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-semibold text-gray-700">Faites glisser votre fichier APK ici</p>
                    <p className="text-xs text-gray-400 mt-1">Ou cliquez pour parcourir les fichiers de votre ordinateur (.apk uniquement)</p>
                  </div>
                )}
              </div>

              {/* Input details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-gray-700">Nom de l'application *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: MemeAI"
                    value={appName}
                    onChange={(e) => setAppName(e.target.value)}
                    className="bg-gray-50 border border-gray-200 rounded-google px-4 py-2 text-sm focus:outline-none focus:border-emerald-600 focus:bg-white transition-all"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-gray-700">Version *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 1.1.0"
                    value={appVersion}
                    onChange={(e) => setAppVersion(e.target.value)}
                    className="bg-gray-50 border border-gray-200 rounded-google px-4 py-2 text-sm focus:outline-none focus:border-emerald-600 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-700">Nom de package (Android Bundle ID)</label>
                <input
                  type="text"
                  placeholder="Ex: com.memeai"
                  value={appPkg}
                  onChange={(e) => setAppPkg(e.target.value)}
                  className="bg-gray-50 border border-gray-200 rounded-google px-4 py-2 text-sm focus:outline-none focus:border-emerald-600 focus:bg-white transition-all"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-700">Description</label>
                <textarea
                  placeholder="Expliquez brièvement ce que fait l'application..."
                  value={appDesc}
                  onChange={(e) => setAppDesc(e.target.value)}
                  rows={4}
                  className="bg-gray-50 border border-gray-200 rounded-google px-4 py-2 text-sm focus:outline-none focus:border-emerald-600 focus:bg-white transition-all resize-none"
                />
              </div>

              {uploadProgress !== null && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold text-gray-600">
                    <span>Téléversement en cours...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div
                      style={{ width: `${uploadProgress}%` }}
                      className="bg-emerald-600 h-full transition-all duration-150"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={uploadProgress !== null}
                className="w-full bg-emerald-600 text-white font-bold py-3 rounded-google shadow-subtle hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[19px]">publish</span>
                Mettre en ligne l'APK
              </button>
            </form>
          </div>
        )}
      </main>

      {/* App Detail Modal */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-google-lg max-w-lg w-full overflow-hidden shadow-premium animate-fade-in">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-gray-100 flex items-start gap-4">
              <div className="w-20 h-20 bg-gradient-to-tr from-emerald-50 to-emerald-100 rounded-google border border-gray-100 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-3xl text-emerald-600">apk_install</span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-xl font-bold text-gray-900 truncate font-sans">{selectedApp.name}</h3>
                <p className="text-xs text-gray-500 truncate mt-0.5">{selectedApp.packageName}</p>
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-semibold text-gray-700">{selectedApp.rating || '4.5'}</span>
                    <span className="material-symbols-outlined text-amber-400 text-xs fill-amber-400">star</span>
                  </div>
                  <span className="text-xs text-gray-400">|</span>
                  <span className="text-xs text-emerald-600 font-semibold">{selectedApp.downloads || '100+'} Téléchargements</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedApp(null)}
                className="material-symbols-outlined text-gray-400 hover:text-gray-700 hover:bg-gray-100 p-1.5 rounded-full"
              >
                close
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-gray-50 p-2.5 rounded-google border border-gray-100">
                  <p className="text-[10px] uppercase font-bold text-gray-400">Taille</p>
                  <p className="text-sm font-bold text-gray-800 mt-0.5">{selectedApp.size}</p>
                </div>
                <div className="bg-gray-50 p-2.5 rounded-google border border-gray-100">
                  <p className="text-[10px] uppercase font-bold text-gray-400">Version</p>
                  <p className="text-sm font-bold text-gray-800 mt-0.5">{selectedApp.version}</p>
                </div>
                <div className="bg-gray-50 p-2.5 rounded-google border border-gray-100">
                  <p className="text-[10px] uppercase font-bold text-gray-400">Publié le</p>
                  <p className="text-xs font-bold text-gray-800 mt-1 truncate">
                    {new Date(selectedApp.createdAt).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Description</h4>
                <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-google border border-gray-100">
                  {selectedApp.description}
                </p>
              </div>

              {/* Direct secure download link */}
              <a
                href={`/api/apks/download/${selectedApp.filename}`}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-google shadow-subtle hover:shadow-premium transition-all flex items-center justify-center gap-2 text-center"
              >
                <span className="material-symbols-outlined text-[19px]">download</span>
                Télécharger l'APK
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
