import { useState, useEffect } from 'react';
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
  category: 'app' | 'game';
  downloads: string;
  rating: string;
  reviewsCount?: string;
  developer: string;
  pegi: string;
}

export default function App() {
  // Navigation states matching Google Play Store bottom navigation
  const [bottomTab, setBottomTab] = useState<'app' | 'game' | 'publish'>('app');
  // Secondary horizontal tabs
  const [subTab, setSubTab] = useState<'pour_vous' | 'classements' | 'categories'>('pour_vous');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [apps, setApps] = useState<AppItem[]>([]);
  const [selectedApp, setSelectedApp] = useState<AppItem | null>(null);

  // App Installation State Simulation
  const [installingAppId, setInstallingAppId] = useState<string | null>(null);
  const [installProgress, setInstallProgress] = useState<number>(0);
  const [isInstalledMap, setIsInstalledMap] = useState<Record<string, boolean>>({});

  // Publishing Stepper Wizard
  const [publishStep, setPublishStep] = useState<number>(1);
  const [appName, setAppName] = useState('');
  const [appVersion, setAppVersion] = useState('1.0.0');
  const [appPkg, setAppPkg] = useState('');
  const [appDesc, setAppDesc] = useState('');
  const [appCategory, setAppCategory] = useState<'app' | 'game'>('app');
  const [appDeveloper, setAppDeveloper] = useState('Mon Entreprise');
  
  const [selectedIconFile, setSelectedIconFile] = useState<File | null>(null);
  const [selectedApkFile, setSelectedApkFile] = useState<File | null>(null);
  
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // Load apps
  const fetchApps = async () => {
    try {
      const response = await fetch('/api/apks');
      if (response.ok) {
        const data = await response.json();
        const populated: AppItem[] = data.map((item: any, index: number) => ({
          ...item,
          category: item.category || (index % 2 === 0 ? 'app' : 'game'),
          downloads: item.downloads || `${50 + (index * 15)}K+`,
          rating: item.rating || (4.2 + (index * 0.1) % 0.8).toFixed(1),
          reviewsCount: `${12 + index * 4}K`,
          developer: item.developer || 'Indie Dev',
          pegi: item.pegi || '3',
        }));
        setApps(populated);
      }
    } catch (err) {
      console.warn('Erreur de chargement des APKs:', err);
    }
  };

  useEffect(() => {
    fetchApps();
  }, []);

  // Filter lists based on bottom tabs
  const filteredApps = apps.filter(app => {
    const matchesTab = app.category === bottomTab;
    const matchesSearch = app.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          app.packageName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  // Dropzone for Icon
  const iconDropzone = useDropzone({
    accept: { 'image/*': ['.png', '.jpg', '.jpeg'] },
    maxFiles: 1,
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        setSelectedIconFile(acceptedFiles[0]);
      }
    }
  });

  // Dropzone for APK
  const apkDropzone = useDropzone({
    accept: { 'application/vnd.android.package-archive': ['.apk'] },
    maxFiles: 1,
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        setSelectedApkFile(file);
        
        // Autoguess values
        if (!appName) {
          const cleanName = file.name.replace('.apk', '').replace(/[-_]/g, ' ');
          setAppName(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
        }
        if (!appPkg) {
          const guessedPkg = 'com.camerstore.' + file.name.toLowerCase().replace(/[^a-z0-9]/g, '');
          setAppPkg(guessedPkg);
        }
      }
    }
  });

  // Handle Publish Submit
  const handlePublishSubmit = async () => {
    if (!selectedApkFile || !appName || !appVersion) {
      setUploadError('Veuillez remplir tous les champs obligatoires.');
      return;
    }

    setUploadProgress(0);
    setUploadError(null);
    setUploadSuccess(false);

    const formData = new FormData();
    formData.append('apk', selectedApkFile);
    formData.append('name', appName);
    formData.append('version', appVersion);
    formData.append('packageName', appPkg);
    formData.append('description', appDesc);
    formData.append('category', appCategory);
    formData.append('developer', appDeveloper);

    try {
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
          // Reset form
          setAppName('');
          setAppVersion('1.0.0');
          setAppPkg('');
          setAppDesc('');
          setSelectedApkFile(null);
          setSelectedIconFile(null);
          setPublishStep(1);
          setBottomTab('app'); // Back to home
          fetchApps();
        } else {
          try {
            const errData = JSON.parse(xhr.responseText);
            setUploadError(errData.error || 'Erreur lors du téléversement.');
          } catch {
            setUploadError('Erreur serveur lors du téléversement.');
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
      setUploadError('Erreur lors du traitement.');
      setUploadProgress(null);
    }
  };

  // Simulate APK Download/Install with Play Protect circular progress
  const startInstallSimulation = (app: AppItem) => {
    if (isInstalledMap[app.id]) return; // Already installed

    setInstallingAppId(app.id);
    setInstallProgress(0);

    const interval = setInterval(() => {
      setInstallProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setInstallingAppId(null);
          setIsInstalledMap(current => ({ ...current, [app.id]: true }));
          
          // Trigger actual file download
          window.location.href = `/api/apks/download/${app.filename}`;
          return 100;
        }
        return prev + 5;
      });
    }, 150);
  };

  return (
    <div className="min-h-screen flex flex-col bg-white font-sans max-w-md mx-auto shadow-xl border-x border-gray-100 pb-16">
      
      {/* Search bar header (Play Store Style) - Shown if not publishing and not in detail */}
      {bottomTab !== 'publish' && !selectedApp && (
        <header className="px-4 pt-4 pb-2">
          <div className="flex items-center bg-gray-50 border border-gray-100 rounded-full px-4 py-2.5 shadow-sm">
            <span className="text-emerald-600 font-black text-lg tracking-tight mr-2">Camer Store</span>
            <input
              type="text"
              placeholder="Rechercher des applis et jeux"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-gray-800 placeholder-gray-500 text-sm focus:outline-none"
            />
            <span className="material-symbols-outlined text-gray-500 text-xl cursor-pointer hover:bg-gray-200/50 p-1 rounded-full">mic</span>
            <span className="material-symbols-outlined text-gray-500 text-xl ml-2 cursor-pointer hover:bg-gray-200/50 p-1 rounded-full relative">
              notifications
              <span className="absolute top-1 right-1 w-2 h-2 bg-blue-600 rounded-full"></span>
            </span>
            <img
              src="/icon-512.png"
              alt="Avatar"
              className="w-7 h-7 rounded-full ml-3 border border-emerald-500/20 object-cover"
            />
          </div>
          
          {/* Secondary Header Navigation Tabs */}
          <nav className="flex gap-6 mt-4 border-b border-gray-100 px-2">
            <button
              onClick={() => setSubTab('pour_vous')}
              className={`pb-2 text-sm font-semibold border-b-2 transition-all ${
                subTab === 'pour_vous' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-gray-500'
              }`}
            >
              Pour vous
            </button>
            <button
              onClick={() => setSubTab('classements')}
              className={`pb-2 text-sm font-semibold border-b-2 transition-all ${
                subTab === 'classements' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-gray-500'
              }`}
            >
              Meilleurs classements
            </button>
            <button
              onClick={() => setSubTab('categories')}
              className={`pb-2 text-sm font-semibold border-b-2 transition-all ${
                subTab === 'categories' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-gray-500'
              }`}
            >
              Catégories
            </button>
          </nav>
        </header>
      )}

      {/* Main Screen Content */}
      <main className="flex-1 overflow-y-auto px-4 py-3">
        {selectedApp ? (
          /* ======================================================== */
          /* APP DETAIL VIEW (Image 3: Canva style detail page) */
          /* ======================================================== */
          <div className="space-y-6 animate-fade-in">
            {/* Top Back/Actions header */}
            <div className="flex items-center justify-between -mx-2">
              <button
                onClick={() => setSelectedApp(null)}
                className="material-symbols-outlined text-gray-600 p-2 hover:bg-gray-100 rounded-full"
              >
                arrow_back
              </button>
              <div className="flex items-center gap-1">
                <span className="material-symbols-outlined text-gray-600 p-2 hover:bg-gray-100 rounded-full">search</span>
                <span className="material-symbols-outlined text-gray-600 p-2 hover:bg-gray-100 rounded-full">more_vert</span>
              </div>
            </div>

            {/* App main header */}
            <div className="flex gap-4">
              <div className="w-20 h-20 bg-gradient-to-tr from-emerald-50 to-emerald-100 rounded-google border border-gray-100 flex items-center justify-center flex-shrink-0 shadow-sm">
                <span className="material-symbols-outlined text-4xl text-emerald-600">apk_install</span>
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold text-gray-900 leading-tight">{selectedApp.name}</h2>
                <p className="text-sm font-semibold text-emerald-600 mt-1">{selectedApp.developer}</p>
                <p className="text-xs text-gray-400 mt-0.5">{selectedApp.packageName}</p>
              </div>
            </div>

            {/* Stats row (Rating, size, PEGI) */}
            <div className="grid grid-cols-3 border-y border-gray-100 py-3.5 text-center">
              <div className="flex flex-col items-center">
                <span className="text-sm font-bold text-gray-900 flex items-center gap-0.5">
                  {selectedApp.rating} <span className="material-symbols-outlined text-gray-700 text-xs fill-gray-700">star</span>
                </span>
                <span className="text-[10px] text-gray-400 font-semibold mt-0.5">{selectedApp.reviewsCount} avis</span>
              </div>
              
              <div className="flex flex-col items-center border-x border-gray-100">
                <span className="material-symbols-outlined text-gray-700 text-sm">download</span>
                <span className="text-[10px] text-gray-400 font-semibold mt-1">{selectedApp.size}</span>
              </div>
              
              <div className="flex flex-col items-center">
                <span className="bg-gray-900 text-white text-[9px] font-bold px-1 py-0.5 rounded-sm leading-none">PEGI {selectedApp.pegi}</span>
                <span className="text-[10px] text-gray-400 font-semibold mt-1">3 ans et plus</span>
              </div>
            </div>

            {/* Download/Progress section */}
            <div className="py-2">
              {installingAppId === selectedApp.id ? (
                /* Installing state with progress ring */
                <div className="flex items-center gap-4 bg-emerald-50/50 p-4 rounded-google border border-emerald-100">
                  <div className="relative w-11 h-11 flex-shrink-0 flex items-center justify-center">
                    {/* SVG Progress Circle */}
                    <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                      <circle
                        cx="22"
                        cy="22"
                        r="18"
                        stroke="#e2e8f0"
                        strokeWidth="3"
                        fill="transparent"
                      />
                      <circle
                        cx="22"
                        cy="22"
                        r="18"
                        stroke="#01875F"
                        strokeWidth="3"
                        fill="transparent"
                        strokeDasharray={113}
                        strokeDashoffset={113 - (113 * installProgress) / 100}
                        className="transition-all duration-150"
                      />
                    </svg>
                    <span className="material-symbols-outlined text-emerald-600 text-lg">apk_install</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-800">Téléchargement en cours...</h4>
                    <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                      <span className="material-symbols-outlined text-emerald-600 text-xs">verified_user</span>
                      Validé par Play Protect
                    </p>
                  </div>
                  <span className="ml-auto text-xs font-bold text-emerald-600">{installProgress}%</span>
                </div>
              ) : (
                /* Primary Buttons (Ouvrir / Annuler) */
                <div className="flex gap-3">
                  <button
                    onClick={() => setSelectedApp(null)}
                    className="flex-1 border border-gray-200 text-emerald-600 font-bold py-2.5 rounded-full hover:bg-gray-50 text-sm text-center"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={() => startInstallSimulation(selectedApp)}
                    className={`flex-1 font-bold py-2.5 rounded-full text-sm text-center transition-all ${
                      isInstalledMap[selectedApp.id]
                        ? 'bg-gray-100 text-gray-500 cursor-default'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                    }`}
                  >
                    {isInstalledMap[selectedApp.id] ? 'Installer' : 'Télécharger'}
                  </button>
                </div>
              )}
            </div>

            {/* Suggestions pour vous */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-gray-900">Suggestions pour vous</h3>
                <span className="material-symbols-outlined text-gray-400 text-lg">more_vert</span>
              </div>
              
              <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                {apps.filter(x => x.id !== selectedApp.id).slice(0, 3).map(item => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedApp(item)}
                    className="w-24 flex-shrink-0 cursor-pointer text-center"
                  >
                    <div className="w-16 h-16 bg-gray-50 border border-gray-100 rounded-google mx-auto flex items-center justify-center shadow-sm">
                      <span className="material-symbols-outlined text-2xl text-emerald-600">apk_install</span>
                    </div>
                    <p className="text-xs font-semibold text-gray-800 mt-2 truncate w-full">{item.name}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{item.rating} ★</p>
                  </div>
                ))}
              </div>
            </div>

            {/* A propos de l'application */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-gray-900">À propos de l'application</h3>
                <span className="material-symbols-outlined text-gray-500 text-lg">arrow_forward</span>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed bg-gray-50 p-4 rounded-google border border-gray-100">
                {selectedApp.description}
              </p>
              <div className="inline-block bg-gray-100 text-gray-700 text-[10px] font-semibold px-3 py-1 rounded-full">
                N° 2 "graphisme et développement"
              </div>
            </div>
          </div>
        ) : bottomTab !== 'publish' ? (
          /* ======================================================== */
          /* PLAY STORE HOME LAYOUT (Image 1: Play Store main screen) */
          /* ======================================================== */
          <div className="space-y-6">
            {/* Section 1: Recommandé pour vous (Horizontal Carousel) */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-gray-900">Recommandé pour vous</h3>
                <span className="material-symbols-outlined text-gray-400 text-lg">arrow_forward</span>
              </div>
              
              <div className="flex gap-5 overflow-x-auto no-scrollbar pb-3">
                {filteredApps.map(app => (
                  <div
                    key={app.id}
                    onClick={() => setSelectedApp(app)}
                    className="w-24 flex-shrink-0 cursor-pointer"
                  >
                    <div className="w-24 h-24 bg-gradient-to-tr from-emerald-50 to-emerald-100 rounded-google border border-gray-100 flex items-center justify-center shadow-sm hover:scale-105 transition-all">
                      <span className="material-symbols-outlined text-4xl text-emerald-600">apk_install</span>
                    </div>
                    <p className="text-xs font-semibold text-gray-800 mt-2.5 truncate w-full">{app.name}</p>
                    <p className="text-[10px] text-gray-400 flex items-center gap-0.5 mt-0.5">
                      {app.rating} <span className="material-symbols-outlined text-[8px] fill-gray-400 text-gray-400">star</span>
                    </p>
                  </div>
                ))}
                
                {filteredApps.length === 0 && (
                  <div className="w-full text-center py-6 text-xs text-gray-400 font-semibold">
                    Aucune application publiée pour le moment.
                  </div>
                )}
              </div>
            </div>

            {/* Section 2: Recommandations (Vertical list style) */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-gray-900">Sponsorisé • Recommandations</h3>
                <span className="material-symbols-outlined text-gray-400 text-lg">more_vert</span>
              </div>
              
              <div className="space-y-3">
                {filteredApps.slice(0, 3).map(app => (
                  <div
                    key={app.id}
                    onClick={() => setSelectedApp(app)}
                    className="flex items-center gap-4 cursor-pointer hover:bg-gray-50 p-2 rounded-google -mx-2 transition-all"
                  >
                    <div className="w-14 h-14 bg-emerald-50 rounded-google flex items-center justify-center flex-shrink-0 shadow-sm">
                      <span className="material-symbols-outlined text-2xl text-emerald-600">apk_install</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-gray-900 truncate">{app.name}</h4>
                      <p className="text-xs text-gray-400 truncate mt-0.5">{app.developer} • {app.size}</p>
                      <p className="text-[10px] text-gray-500 mt-0.5 flex items-center gap-0.5">
                        {app.rating} <span className="material-symbols-outlined text-[9px] fill-gray-400 text-gray-400">star</span>
                      </p>
                    </div>
                    <span className="material-symbols-outlined text-gray-400 text-lg">more_vert</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 3: Découvrez des jeux (Category Grid) */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-gray-900">Découvrez des jeux</h3>
                <span className="material-symbols-outlined text-gray-400 text-lg">arrow_forward</span>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 hover:bg-emerald-50/40 p-4 rounded-google border border-gray-100 flex items-center justify-between cursor-pointer transition-all">
                  <span className="text-sm font-semibold text-gray-800">Action</span>
                  <span className="material-symbols-outlined text-emerald-600 text-xl">sports_esports</span>
                </div>
                <div className="bg-gray-50 hover:bg-emerald-50/40 p-4 rounded-google border border-gray-100 flex items-center justify-between cursor-pointer transition-all">
                  <span className="text-sm font-semibold text-gray-800">Simulation</span>
                  <span className="material-symbols-outlined text-emerald-600 text-xl">precision_manufacturing</span>
                </div>
                <div className="bg-gray-50 hover:bg-emerald-50/40 p-4 rounded-google border border-gray-100 flex items-center justify-between cursor-pointer transition-all">
                  <span className="text-sm font-semibold text-gray-800">Aventure</span>
                  <span className="material-symbols-outlined text-emerald-600 text-xl">explore</span>
                </div>
                <div className="bg-gray-50 hover:bg-emerald-50/40 p-4 rounded-google border border-gray-100 flex items-center justify-between cursor-pointer transition-all">
                  <span className="text-sm font-semibold text-gray-800">Course</span>
                  <span className="material-symbols-outlined text-emerald-600 text-xl">sports_motorsports</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ======================================================== */
          /* PUBLISH SCREEN (Image 2: Camer Store upload wizard) */
          /* ======================================================== */
          <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div>
              <div className="flex items-center gap-2">
                <button onClick={() => setBottomTab('app')} className="material-symbols-outlined text-gray-600">arrow_back</button>
                <h2 className="text-lg font-bold text-gray-900">Publier sur Camer Store</h2>
              </div>
              <p className="text-xs text-gray-400 mt-1">Partagez votre application avec des millions d'utilisateurs sur Camer Store.</p>
            </div>

            {/* Multi-step progress indicator */}
            <div className="flex justify-between items-center px-4 py-2 border-b border-gray-100">
              {[
                { step: 1, label: 'Informations' },
                { step: 2, label: 'APK Release' }
              ].map((s) => (
                <div key={s.step} className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    publishStep === s.step ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-400'
                  }`}>
                    {s.step}
                  </div>
                  <span className={`text-[10px] font-bold ${
                    publishStep === s.step ? 'text-emerald-600' : 'text-gray-400'
                  }`}>{s.label}</span>
                </div>
              ))}
            </div>

            {uploadSuccess && (
              <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 p-4 rounded-google flex items-center gap-3">
                <span className="material-symbols-outlined text-emerald-600">check_circle</span>
                <p className="text-xs font-semibold">Application publiée et mise en ligne avec succès !</p>
              </div>
            )}

            {uploadError && (
              <div className="bg-rose-50 border border-rose-100 text-rose-800 p-4 rounded-google flex items-center gap-3 animate-shake">
                <span className="material-symbols-outlined text-rose-600">error</span>
                <p className="text-xs font-semibold">{uploadError}</p>
              </div>
            )}

            {publishStep === 1 ? (
              /* STEP 1: Basic Information */
              <div className="space-y-4">
                <div className="bg-white border border-gray-100 rounded-google p-5 shadow-sm space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm">description</span> Informations de base
                  </h4>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-gray-700">Nom de l'application *</label>
                    <input
                      type="text"
                      placeholder="Ex : Mon Application"
                      value={appName}
                      onChange={(e) => setAppName(e.target.value)}
                      className="bg-gray-50 border border-gray-200 rounded-google px-4 py-2 text-sm focus:outline-none focus:border-emerald-600 focus:bg-white transition-all"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-gray-700">Nom du package *</label>
                    <input
                      type="text"
                      placeholder="Ex : com.monapp.exemple"
                      value={appPkg}
                      onChange={(e) => setAppPkg(e.target.value)}
                      className="bg-gray-50 border border-gray-200 rounded-google px-4 py-2 text-sm focus:outline-none focus:border-emerald-600 focus:bg-white transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-gray-700">Catégorie *</label>
                      <select
                        value={appCategory}
                        onChange={(e) => setAppCategory(e.target.value as any)}
                        className="bg-gray-50 border border-gray-200 rounded-google px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-600 focus:bg-white transition-all"
                      >
                        <option value="app">Applications</option>
                        <option value="game">Jeux</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-gray-700">Version *</label>
                      <input
                        type="text"
                        placeholder="Ex : 1.0.0"
                        value={appVersion}
                        onChange={(e) => setAppVersion(e.target.value)}
                        className="bg-gray-50 border border-gray-200 rounded-google px-4 py-2 text-sm focus:outline-none focus:border-emerald-600 focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-gray-700">Développeur</label>
                    <input
                      type="text"
                      placeholder="Ex : Canva Inc"
                      value={appDeveloper}
                      onChange={(e) => setAppDeveloper(e.target.value)}
                      className="bg-gray-50 border border-gray-200 rounded-google px-4 py-2 text-sm focus:outline-none focus:border-emerald-600 focus:bg-white transition-all"
                    />
                  </div>
                </div>

                {/* Stepper Footer */}
                <div className="flex gap-3 justify-end pt-2">
                  <button
                    onClick={() => setBottomTab('app')}
                    className="border border-gray-200 text-gray-600 font-bold px-6 py-2 rounded-full hover:bg-gray-50 text-sm"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={() => {
                      if (!appName) {
                        setUploadError("Le nom de l'application est requis.");
                        return;
                      }
                      setUploadError(null);
                      setPublishStep(2);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2 rounded-full text-sm shadow-sm"
                  >
                    Suivant
                  </button>
                </div>
              </div>
            ) : (
              /* STEP 2: APK Upload & Icon upload */
              <div className="space-y-4">
                {/* Icon upload card */}
                <div className="bg-white border border-gray-100 rounded-google p-5 shadow-sm space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm">image</span> Icône de l'application *
                  </h4>
                  <p className="text-[10px] text-gray-400">Utilisez une icône au format PNG ou JPG. Taille recommandée : 512 x 512 px.</p>
                  
                  <div {...iconDropzone.getRootProps()} className={`border-2 border-dashed rounded-google p-6 text-center cursor-pointer transition-all ${
                    iconDropzone.isDragActive ? 'border-emerald-600 bg-emerald-50' : 'border-gray-200 hover:border-gray-300 bg-gray-50'
                  }`}>
                    <input {...iconDropzone.getInputProps()} />
                    <span className="material-symbols-outlined text-3xl text-emerald-600 mb-1">cloud_upload</span>
                    {selectedIconFile ? (
                      <p className="text-xs font-bold text-emerald-600 truncate">{selectedIconFile.name}</p>
                    ) : (
                      <div>
                        <p className="text-xs font-semibold text-gray-700">Téléverser une icône</p>
                        <p className="text-[9px] text-gray-400 mt-0.5">Glissez-déposez ou sélectionnez un fichier PNG, JPG jusqu'à 2 Mo</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* APK release card */}
                <div className="bg-white border border-gray-100 rounded-google p-5 shadow-sm space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm">adb</span> APK Release *
                  </h4>
                  <p className="text-[10px] text-gray-400">Téléversez votre fichier APK de release. Assurez-vous qu'il est signé.</p>

                  <div {...apkDropzone.getRootProps()} className={`border-2 border-dashed rounded-google p-6 text-center cursor-pointer transition-all ${
                    apkDropzone.isDragActive ? 'border-emerald-600 bg-emerald-50' : 'border-gray-200 hover:border-gray-300 bg-gray-50'
                  }`}>
                    <input {...apkDropzone.getInputProps()} />
                    <span className="material-symbols-outlined text-3xl text-emerald-600 mb-1">upload_file</span>
                    {selectedApkFile ? (
                      <div>
                        <p className="text-xs font-bold text-emerald-600 truncate">{selectedApkFile.name}</p>
                        <p className="text-[9px] text-gray-400 mt-0.5">{(selectedApkFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs font-semibold text-gray-700">Téléverser un fichier APK</p>
                        <p className="text-[9px] text-gray-400 mt-0.5">Glissez-déposez ou sélectionnez un fichier APK jusqu'à 100 Mo</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Description and metadata */}
                <div className="bg-white border border-gray-100 rounded-google p-5 shadow-sm flex flex-col gap-2">
                  <label className="text-xs font-bold text-gray-700">Description</label>
                  <textarea
                    placeholder="Présentez les fonctionnalités de votre application..."
                    value={appDesc}
                    onChange={(e) => setAppDesc(e.target.value)}
                    rows={3}
                    className="bg-gray-50 border border-gray-200 rounded-google px-4 py-2 text-sm focus:outline-none focus:border-emerald-600 focus:bg-white transition-all resize-none"
                  />
                </div>

                {uploadProgress !== null && (
                  <div className="space-y-1 bg-white border border-gray-100 p-4 rounded-google">
                    <div className="flex justify-between text-[10px] font-semibold text-gray-600">
                      <span>Téléversement en cours...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        style={{ width: `${uploadProgress}%` }}
                        className="bg-emerald-600 h-full transition-all duration-150"
                      />
                    </div>
                  </div>
                )}

                {/* Navigation Buttons */}
                <div className="flex gap-3 justify-end pt-2">
                  <button
                    disabled={uploadProgress !== null}
                    onClick={() => setPublishStep(1)}
                    className="border border-gray-200 text-gray-600 font-bold px-6 py-2 rounded-full hover:bg-gray-50 text-sm disabled:opacity-50"
                  >
                    Précédent
                  </button>
                  <button
                    disabled={uploadProgress !== null || !selectedApkFile}
                    onClick={handlePublishSubmit}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2 rounded-full text-sm shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-sm">cloud_done</span>
                    Publier l'APK
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Bottom Navigation Bar (Google Play Store Style) */}
      <footer className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-gray-100 py-2.5 px-6 flex justify-between items-center z-40 shadow-lg">
        <button
          onClick={() => { setBottomTab('app'); setSelectedApp(null); }}
          className={`flex flex-col items-center gap-1 transition-all ${
            bottomTab === 'app' ? 'text-emerald-600 font-bold' : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <div className={`px-5 py-1 rounded-full ${bottomTab === 'app' ? 'bg-emerald-50' : 'bg-transparent'}`}>
            <span className="material-symbols-outlined text-xl">apps</span>
          </div>
          <span className="text-[10px]">Applis</span>
        </button>

        <button
          onClick={() => { setBottomTab('game'); setSelectedApp(null); }}
          className={`flex flex-col items-center gap-1 transition-all ${
            bottomTab === 'game' ? 'text-emerald-600 font-bold' : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <div className={`px-5 py-1 rounded-full ${bottomTab === 'game' ? 'bg-emerald-50' : 'bg-transparent'}`}>
            <span className="material-symbols-outlined text-xl">sports_esports</span>
          </div>
          <span className="text-[10px]">Jeux</span>
        </button>

        <button
          onClick={() => { setBottomTab('publish'); setSelectedApp(null); }}
          className={`flex flex-col items-center gap-1 transition-all ${
            bottomTab === 'publish' ? 'text-emerald-600 font-bold' : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <div className={`px-5 py-1 rounded-full ${bottomTab === 'publish' ? 'bg-emerald-50' : 'bg-transparent'}`}>
            <span className="material-symbols-outlined text-xl">publish</span>
          </div>
          <span className="text-[10px]">Publier</span>
        </button>
      </footer>
    </div>
  );
}
