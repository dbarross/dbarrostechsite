// ... existing code ...
import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  signInWithCustomToken, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  addDoc, 
  deleteDoc, 
  updateDoc 
} from 'firebase/firestore';

// Inicialização segura do Firebase com suporte a ambiente dinâmico e Google Sites / IFrames
const firebaseConfig = typeof __firebase_config !== 'undefined' 
  ? JSON.parse(__firebase_config) 
  : {
      apiKey: "demo-api-key",
      authDomain: "dbarros-tech.firebaseapp.com",
      projectId: "dbarros-tech",
      storageBucket: "dbarros-tech.appspot.com",
      messagingSenderId: "123456789",
      appId: "1:123456789:web:demo"
    };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'dbarros-tech-app';

export default function App() {
  const [activeTab, setActiveTab] = useState('all');
  const [activeServiceTab, setActiveServiceTab] = useState('assistencia');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Auth & Cloud State
  const [user, setUser] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('signup'); // 'signup', 'login', or 'admin-login'
  const [adminPassInput, setAdminPassInput] = useState('');
  const [themeModalOpen, setThemeModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [adminAlert, setAdminAlert] = useState('');

  // Customization & Theme State (Full Admin Control & Cloud Persistence)
  const [themeConfig, setThemeConfig] = useState({
    primaryColor: '#0088FF',
    secondaryColor: '#00F0FF',
    bgColor: '#0B0F17',
    cardBgColor: '#0E1422',
    heroTitle: 'Soluções Inteligentes em',
    heroSubtitle: 'TI, Redes & Eletrônicos',
    heroDescription: 'Especialistas em manutenção de celulares e computadores, infraestrutura corporativa de redes MikroTik, e revenda com procedência garantida de iPhones, Androids e acessórios.'
  });
  
  // Modals
  const [leadsModalOpen, setLeadsModalOpen] = useState(false);
  const [editProductModalOpen, setEditProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  // Initial fallback products
  const [products, setProducts] = useState([
    {
      id: '1',
      title: 'iPhone 13 Pro 128GB - Semi-Novo',
      category: 'apple',
      price: 'R$ 3.890',
      specs: 'Saúde Bateria 94% • Caixa + Cabo C-Lightning • Garantia DBARROS',
      image: 'https://images.unsplash.com/photo-1632661674596-df8be070a5c5?auto=format&fit=crop&q=80&w=600',
      badge: 'Grade A+',
      badgeColor: 'bg-blue-500/20 text-blue-400 border-blue-500/30'
    },
    {
      id: '2',
      title: 'iPhone 11 64GB Black',
      category: 'apple',
      price: 'R$ 1.990',
      specs: 'Tela Original • Bateria OK • Revisado em Bancada',
      image: 'https://images.unsplash.com/photo-1574944985070-8f3ebc6b79d2?auto=format&fit=crop&q=80&w=600',
      badge: 'Pronta Entrega',
      badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
    },
    {
      id: '3',
      title: 'Cabo USB-C p/ Lightning Baseus 20W 2m',
      category: 'acessórios',
      price: 'R$ 79,90',
      specs: 'Carga Rápida Turbo • Pontas Reforçadas Anti-quebra',
      image: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&q=80&w=600',
      badge: 'Garantia 6 Meses',
      badgeColor: 'bg-purple-500/20 text-purple-400 border-purple-500/30'
    }
  ]);

  const [vips, setVips] = useState([]);

  // Form states
  const [signupForm, setSignupForm] = useState({ name: '', phone: '', email: '', password: '' });

  // 1. Firebase Authentication Setup
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Erro ao autenticar no Firebase:", err);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // 2. Real-time Firestore Synchronizations
  useEffect(() => {
    if (!user) return;

    // Sincronizar Produtos em Tempo Real
    const productsRef = collection(db, 'artifacts', appId, 'public', 'data', 'products');
    const unsubscribeProducts = onSnapshot(productsRef, (snapshot) => {
      if (!snapshot.empty) {
        const loadedProducts = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setProducts(loadedProducts);
      }
    }, (error) => console.error("Erro ao buscar produtos:", error));

    // Sincronizar Tema/Configurações em Tempo Real
    const themeDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'theme');
    const unsubscribeTheme = onSnapshot(themeDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setThemeConfig(docSnap.data());
      }
    }, (error) => console.error("Erro ao buscar configurações:", error));

    // Sincronizar Cadastros VIP (Leads) em Tempo Real
    const vipsRef = collection(db, 'artifacts', appId, 'public', 'data', 'vips');
    const unsubscribeVips = onSnapshot(vipsRef, (snapshot) => {
      const loadedVips = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setVips(loadedVips);
    }, (error) => console.error("Erro ao buscar membros VIP:", error));

    return () => {
      unsubscribeProducts();
      unsubscribeTheme();
      unsubscribeVips();
    };
  }, [user]);

  // Cloud Actions (Save, Update, Delete)
  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!editingProduct || !user) return;
    setIsSaving(true);

    try {
      const prodRef = doc(db, 'artifacts', appId, 'public', 'data', 'products', String(editingProduct.id));
      await setDoc(prodRef, editingProduct, { merge: true });
      setEditProductModalOpen(false);
      setEditingProduct(null);
    } catch (err) {
      console.error("Erro ao salvar produto no Firestore:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddNewProduct = async () => {
    if (!user) return;
    setIsSaving(true);
    const newId = String(Date.now());
    const newProd = {
      id: newId,
      title: 'Novo Produto DBARROS',
      category: 'apple',
      price: 'R$ 0,00',
      specs: 'Descrição rápida das especificações...',
      image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&q=80&w=600',
      badge: 'Novo',
      badgeColor: 'bg-blue-500/20 text-blue-400 border-blue-500/30'
    };

    try {
      const prodRef = doc(db, 'artifacts', appId, 'public', 'data', 'products', newId);
      await setDoc(prodRef, newProd);
      handleOpenEditProduct(newProd);
    } catch (err) {
      console.error("Erro ao criar produto:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!user) return;
    setIsSaving(true);
    try {
      const prodRef = doc(db, 'artifacts', appId, 'public', 'data', 'products', String(id));
      await deleteDoc(prodRef);
      setEditProductModalOpen(false);
    } catch (err) {
      console.error("Erro ao remover produto:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveTheme = async (newTheme) => {
    setThemeConfig(newTheme);
    if (!user) return;
    try {
      const themeDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'theme');
      await setDoc(themeDocRef, newTheme, { merge: true });
    } catch (err) {
      console.error("Erro ao salvar tema no Firestore:", err);
    }
  };

  const handleRegisterVip = async (e) => {
    e.preventDefault();
    if (!user) return;

    const vipData = {
      name: signupForm.name || 'Cliente VIP',
      phone: signupForm.phone,
      createdAt: new Date().toISOString()
    };

    try {
      const vipsCollection = collection(db, 'artifacts', appId, 'public', 'data', 'vips');
      await addDoc(vipsCollection, vipData);
      setCurrentUser({ name: vipData.name });
      setAuthModalOpen(false);
      setSignupForm({ name: '', phone: '', email: '', password: '' });
    } catch (err) {
      console.error("Erro ao cadastrar VIP:", err);
    }
  };

  const handleOpenEditProduct = (product) => {
    setEditingProduct({ ...product });
    setEditProductModalOpen(true);
  };

  const handleAdminAuth = (e) => {
    e.preventDefault();
    if (adminPassInput === 'Aprovatt@123') {
      setIsAdmin(true);
      setAuthModalOpen(false);
      setAdminPassInput('');
      setAdminAlert('');
    } else {
      setAdminAlert('Senha incorreta! Verifique os caracteres digitados.');
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesTab = activeTab === 'all' || product.category === activeTab;
    const matchesSearch = product.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          product.specs.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return (
    <div 
      className="min-h-screen text-slate-100 font-sans antialiased selection:bg-[#0088FF] selection:text-white transition-colors duration-300 w-full overflow-x-hidden"
      style={{ backgroundColor: themeConfig.bgColor }}
    >
      {/* Top Admin Banner if active */}
      {isAdmin && (
        <div className="bg-gradient-to-r from-blue-700 via-cyan-600 to-blue-800 text-white px-4 py-2 text-xs font-bold flex items-center justify-between shadow-lg sticky top-0 z-50">
          <div className="flex items-center space-x-2">
            <span className="bg-white text-blue-800 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider">Acesso Full Admin (Nuvem Conectada)</span>
            <span>Alterações são salvas em tempo real no Firestore!</span>
          </div>
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => setLeadsModalOpen(true)}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-3 py-1 rounded transition flex items-center space-x-1 font-extrabold shadow"
            >
              <span>📋 Ver Cadastros VIP ({vips.length})</span>
            </button>
            <button 
              onClick={() => setThemeModalOpen(true)}
              className="bg-[#00F0FF] hover:bg-[#00D0FF] text-slate-950 px-3 py-1 rounded transition flex items-center space-x-1 font-extrabold shadow"
            >
              <span>🎨 Alterar Cores & Temas</span>
            </button>
            <button 
              onClick={handleAddNewProduct}
              className="bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded transition flex items-center space-x-1"
            >
              <span>+ Adicionar Produto</span>
            </button>
            <button 
              onClick={() => setIsAdmin(false)} 
              className="bg-red-500/80 hover:bg-red-600 text-white px-3 py-1 rounded transition"
            >
              Sair do Modo Admin
            </button>
          </div>
        </div>
      )}

      {/* Header Navigation */}
      <header className={`sticky ${isAdmin ? 'top-8' : 'top-0'} z-40 backdrop-blur-md border-b border-slate-800/80`} style={{ backgroundColor: `${themeConfig.bgColor}E6` }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <svg className="w-10 h-10" viewBox="0 0 400 400" fill="none">
              <polygon points="200,30 345,115 345,285 200,370 55,285 55,115" fill={themeConfig.bgColor} stroke={themeConfig.primaryColor} strokeWidth="8"/>
              <path d="M125 105 H195 C235 105 255 125 255 155 C255 175 240 190 220 198 C245 205 265 225 265 255 C265 288 240 308 195 308 H125 V105 Z" stroke={themeConfig.primaryColor} strokeWidth="16" fill="none"/>
              <path d="M165 150 H200 C215 150 225 158 225 170 C225 182 215 190 200 190 H165 V150 Z" stroke={themeConfig.primaryColor} strokeWidth="12" fill="none"/>
              <path d="M165 222 H205 C220 222 232 230 232 245 C232 260 220 268 205 268 H165 V222 Z" stroke={themeConfig.primaryColor} strokeWidth="12" fill="none"/>
              <circle cx="200" cy="170" r="8" fill={themeConfig.primaryColor}/>
              <circle cx="205" cy="245" r="8" fill={themeConfig.primaryColor}/>
              <path d="M200 170 L240 170" stroke={themeConfig.primaryColor} strokeWidth="8"/>
              <path d="M205 245 L245 245" stroke={themeConfig.primaryColor} strokeWidth="8"/>
              <circle cx="240" cy="170" r="5" fill={themeConfig.secondaryColor}/>
              <circle cx="245" cy="245" r="5" fill={themeConfig.secondaryColor}/>
            </svg>
            <div>
              <span className="font-extrabold text-xl tracking-wider text-white">DBARROS <span style={{ color: themeConfig.primaryColor }}>TECH</span></span>
              <span className="block text-[10px] text-slate-400 font-mono tracking-widest uppercase">TI • REDES • CELULARES</span>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center space-x-6 text-sm font-medium text-slate-300">
            <a href="#inicio" className="hover:opacity-80 transition">Início</a>
            <a href="#loja" className="hover:opacity-80 transition">Loja & Acessórios</a>
            <a href="#vip" className="hover:opacity-80 transition flex items-center space-x-1" style={{ color: themeConfig.secondaryColor }}>
              <span>✨ Clube VIP</span>
            </a>
          </nav>

          {/* Action Buttons */}
          <div className="flex items-center space-x-3">
            {!isAdmin ? (
              <button
                onClick={() => { setAuthMode('admin-login'); setAuthModalOpen(true); }}
                className="text-xs text-slate-400 hover:text-cyan-400 underline decoration-slate-600 mr-2 hidden sm:inline-block"
              >
                Painel Admin
              </button>
            ) : null}

            {currentUser ? (
              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold bg-cyan-950 text-cyan-300 border border-cyan-800 px-3 py-1.5 rounded-full flex items-center space-x-1">
                  <span>👤 {currentUser.name.split(' ')[0]}</span>
                </span>
                <button 
                  onClick={() => setCurrentUser(null)} 
                  className="text-xs text-slate-400 hover:text-white px-2 py-1"
                >
                  Sair
                </button>
              </div>
            ) : (
              <button 
                onClick={() => { setAuthMode('login'); setAuthModalOpen(true); }}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
              >
                Entrar / Cadastrar
              </button>
            )}

            <a 
              href="https://wa.me/5575992423627?text=Ol%C3%A1%2C%20preciso%20de%20atendimento%20t%C3%A9cnico%20DBARROS%20TECH!"
              target="_blank" 
              rel="noreferrer"
              style={{ backgroundColor: themeConfig.primaryColor }}
              className="px-4 py-2 text-xs font-semibold rounded-lg hover:opacity-90 text-white shadow-lg transition flex items-center space-x-2"
            >
              <span>Falar com Técnico</span>
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section id="inicio" className="relative py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div 
              className="inline-flex items-center space-x-2 px-3 py-1 rounded-full border text-xs font-semibold mb-6"
              style={{ 
                backgroundColor: `${themeConfig.primaryColor}1A`,
                borderColor: `${themeConfig.primaryColor}33`,
                color: themeConfig.primaryColor
              }}
            >
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: themeConfig.secondaryColor }}></span>
              <span>Assistência Técnica & TI de Alta Performance</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight mb-6">
              {themeConfig.heroTitle} <span className="text-transparent bg-clip-text" style={{ backgroundImage: `linear-gradient(to right, ${themeConfig.primaryColor}, ${themeConfig.secondaryColor})` }}>{themeConfig.heroSubtitle}</span>
            </h1>
            <p className="text-slate-400 text-base sm:text-lg mb-8 max-w-xl leading-relaxed">
              {themeConfig.heroDescription}
            </p>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
              <a 
                href="https://wa.me/5575992423627?text=Gostaria%20de%20solicitar%20um%20or%C3%A7amento"
                target="_blank"
                rel="noreferrer"
                style={{ backgroundColor: themeConfig.primaryColor }}
                className="px-6 py-3.5 hover:opacity-90 text-white font-bold rounded-xl shadow-lg transition text-center"
              >
                Solicitar Orçamento no WhatsApp
              </a>
              <button 
                onClick={() => { setAuthMode('login'); setAuthModalOpen(true); }}
                className="px-6 py-3.5 bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold rounded-xl transition text-center"
              >
                Cadastrar no Clube VIP
              </button>
            </div>
          </div>

          <div className="relative">
            <div 
              className="absolute -inset-1 rounded-3xl blur-2xl opacity-20"
              style={{ backgroundImage: `linear-gradient(to right, ${themeConfig.primaryColor}, ${themeConfig.secondaryColor})` }}
            ></div>
            <div className="relative border border-slate-800 rounded-2xl p-6 shadow-2xl" style={{ backgroundColor: themeConfig.cardBgColor }}>
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                  <span className="text-xs font-mono text-slate-500 ml-2">dbarrostech-cloud v3.0</span>
                </div>
                <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded">FIRESTORE: ONLINE</span>
              </div>
              
              <div className="space-y-4 font-mono text-xs">
                <div className="p-3 bg-slate-900/90 rounded-lg border border-slate-800 flex items-start space-x-3">
                  <span style={{ color: themeConfig.secondaryColor }}>⚡</span>
                  <div>
                    <span className="text-slate-300 font-bold block">Manutenção & Reparo em Placas</span>
                    <span className="text-slate-500">Troca de tela, bateria, microsoldagem e desoxidação.</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-900/90 rounded-lg border border-slate-800 flex items-start space-x-3">
                  <span style={{ color: themeConfig.primaryColor }}>🌐</span>
                  <div>
                    <span className="text-slate-300 font-bold block">Redes & Roteamento MikroTik</span>
                    <span className="text-slate-500">Balanceamento de links, cabeamento estruturado e VPN.</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-900/90 rounded-lg border border-slate-800 flex items-start space-x-3">
                  <span style={{ color: themeConfig.secondaryColor }}>📱</span>
                  <div>
                    <span className="text-slate-300 font-bold block">Apple & Android com Garantia</span>
                    <span className="text-slate-500">Aparelhos revisados e pronta entrega em Alagoinhas.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Loja & Vitrine de Produtos com Gerenciamento Admin e Nuvem */}
      <section id="loja" className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-slate-800/60">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-3xl font-bold text-white">Vitrine & Seminovos</h2>
              {isAdmin && (
                <span className="bg-yellow-500/20 text-yellow-300 text-xs px-2.5 py-1 rounded-md border border-yellow-500/40 font-mono">
                  ☁️ Firestore Cloud Sincronizado
                </span>
              )}
            </div>
            <p className="text-slate-400 text-sm mt-1">Aparelhos testados e revisados com garantia DBARROS TECH</p>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <input 
              type="text"
              placeholder="Buscar aparelho ou cabo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-[#0088FF] w-48 sm:w-64"
            />
            
            <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
              <button 
                onClick={() => setActiveTab('all')}
                style={{ backgroundColor: activeTab === 'all' ? themeConfig.primaryColor : 'transparent' }}
                className={`px-3 py-1.5 rounded-lg font-medium transition ${activeTab === 'all' ? 'text-white' : 'text-slate-400 hover:text-white'}`}
              >
                Todos
              </button>
              <button 
                onClick={() => setActiveTab('apple')}
                style={{ backgroundColor: activeTab === 'apple' ? themeConfig.primaryColor : 'transparent' }}
                className={`px-3 py-1.5 rounded-lg font-medium transition ${activeTab === 'apple' ? 'text-white' : 'text-slate-400 hover:text-white'}`}
              >
                Apple
              </button>
              <button 
                onClick={() => setActiveTab('android')}
                style={{ backgroundColor: activeTab === 'android' ? themeConfig.primaryColor : 'transparent' }}
                className={`px-3 py-1.5 rounded-lg font-medium transition ${activeTab === 'android' ? 'text-white' : 'text-slate-400 hover:text-white'}`}
              >
                Android
              </button>
              <button 
                onClick={() => setActiveTab('acessórios')}
                style={{ backgroundColor: activeTab === 'acessórios' ? themeConfig.primaryColor : 'transparent' }}
                className={`px-3 py-1.5 rounded-lg font-medium transition ${activeTab === 'acessórios' ? 'text-white' : 'text-slate-400 hover:text-white'}`}
              >
                Acessórios
              </button>
            </div>

            {isAdmin && (
              <button 
                onClick={handleAddNewProduct}
                disabled={isSaving}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1 disabled:opacity-50"
              >
                <span>+ Criar Produto</span>
              </button>
            )}
          </div>
        </div>

        {/* Product Cards Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => (
            <div 
              key={product.id}
              className="group border border-slate-800 hover:border-blue-500/50 rounded-2xl overflow-hidden transition-all duration-300 flex flex-col justify-between relative"
              style={{ backgroundColor: themeConfig.cardBgColor }}
            >
              {/* Product Image & Badge */}
              <div>
                <div className="relative h-48 overflow-hidden bg-slate-950">
                  <img 
                    src={product.image} 
                    alt={product.title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                  />
                  <span className={`absolute top-3 left-3 text-[10px] font-bold px-2.5 py-1 rounded-md border backdrop-blur-md ${product.badgeColor}`}>
                    {product.badge}
                  </span>

                  {isAdmin && (
                    <button 
                      onClick={() => handleOpenEditProduct(product)}
                      className="absolute top-3 right-3 bg-yellow-500 hover:bg-yellow-400 text-black font-extrabold text-xs px-3 py-1.5 rounded-lg shadow-lg transition flex items-center space-x-1"
                    >
                      <span>✏️ Editar Produto</span>
                    </button>
                  )}
                </div>

                {/* Info */}
                <div className="p-5">
                  <h3 className="font-bold text-slate-100 text-base mb-2 group-hover:text-blue-400 transition">
                    {product.title}
                  </h3>
                  <p className="text-slate-400 text-xs leading-relaxed mb-4">
                    {product.specs}
                  </p>
                </div>
              </div>

              {/* Price & Action */}
              <div className="p-5 pt-0 border-t border-slate-800/50 flex items-center justify-between mt-auto">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-mono block">VALOR</span>
                  <span className="text-xl font-extrabold" style={{ color: themeConfig.secondaryColor }}>{product.price}</span>
                </div>

                {isAdmin ? (
                  <button 
                    onClick={() => handleOpenEditProduct(product)}
                    className="px-3 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 border border-yellow-500/40 text-xs font-bold rounded-xl transition"
                  >
                    Editar Tudo
                  </button>
                ) : (
                  <a 
                    href={`https://wa.me/5575992423627?text=Tenho%20interesse%20no%20${encodeURIComponent(product.title)}%20pelo%20valor%20de%20${encodeURIComponent(product.price)}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ borderColor: `${themeConfig.primaryColor}55`, color: themeConfig.primaryColor }}
                    className="px-4 py-2 bg-slate-900/60 hover:bg-blue-600 hover:text-white border text-xs font-bold rounded-xl transition"
                  >
                    Consultar &gt;
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Admin Leads (Cadastros VIP) Modal */}
      {leadsModalOpen && isAdmin && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0E1422] border border-amber-500/40 rounded-2xl w-full max-w-2xl p-6 shadow-2xl relative max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                <span>📋 Cadastros do Clube VIP ({vips.length})</span>
              </h3>
              <button 
                onClick={() => setLeadsModalOpen(false)}
                className="text-slate-400 hover:text-white text-xl"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto space-y-3 flex-1 pr-2">
              {vips.length === 0 ? (
                <p className="text-slate-400 text-xs text-center py-8">Nenhum cadastro recebido ainda.</p>
              ) : (
                vips.map((vip) => (
                  <div key={vip.id} className="p-4 bg-slate-900 rounded-xl border border-slate-800 flex justify-between items-center text-xs">
                    <div>
                      <span className="font-bold text-slate-100 text-sm block">{vip.name}</span>
                      <span className="text-slate-400">WhatsApp: {vip.phone}</span>
                    </div>
                    <a 
                      href={`https://wa.me/55${vip.phone.replace(/\D/g, '')}?text=Ol%C3%A1%20${encodeURIComponent(vip.name)}%2C%20seja%20bem-vindo(a)%20ao%20Clube%20VIP%20DBARROS%20TECH!`}
                      target="_blank"
                      rel="noreferrer"
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-lg transition"
                    >
                      Abrir Whats
                    </a>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Admin Edit Product Modal */}
      {editProductModalOpen && editingProduct && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0E1422] border border-slate-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                <span>✏️ Editar Produto no Cloud Firestore</span>
              </h3>
              <button 
                onClick={() => setEditProductModalOpen(false)}
                className="text-slate-400 hover:text-white text-xl"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Nome do Produto</label>
                <input 
                  type="text" 
                  value={editingProduct.title}
                  onChange={(e) => setEditingProduct({ ...editingProduct, title: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Preço (ex: R$ 3.890)</label>
                  <input 
                    type="text" 
                    value={editingProduct.price}
                    onChange={(e) => setEditingProduct({ ...editingProduct, price: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-cyan-400 font-bold focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Categoria</label>
                  <select
                    value={editingProduct.category}
                    onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="apple">Apple</option>
                    <option value="android">Android</option>
                    <option value="acessórios">Acessórios</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Especificações / Descrição</label>
                <textarea 
                  rows="3"
                  value={editingProduct.specs}
                  onChange={(e) => setEditingProduct({ ...editingProduct, specs: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-200 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Etiqueta (Badge)</label>
                  <input 
                    type="text" 
                    value={editingProduct.badge}
                    onChange={(e) => setEditingProduct({ ...editingProduct, badge: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">URL da Imagem</label>
                  <input 
                    type="text" 
                    value={editingProduct.image}
                    onChange={(e) => setEditingProduct({ ...editingProduct, image: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-400 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-800 mt-6">
                <button 
                  type="button"
                  onClick={() => handleDeleteProduct(editingProduct.id)}
                  className="px-4 py-2 bg-red-950/60 hover:bg-red-900 text-red-400 border border-red-800 rounded-xl font-bold transition"
                >
                  Excluir Produto
                </button>

                <div className="flex space-x-2">
                  <button 
                    type="button"
                    onClick={() => setEditProductModalOpen(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    disabled={isSaving}
                    className="px-5 py-2 bg-[#0088FF] hover:bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 transition disabled:opacity-50"
                  >
                    {isSaving ? 'Salvando...' : 'Salvar na Nuvem'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Theme & Customization Modal */}
      {themeModalOpen && isAdmin && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0E1422] border border-cyan-500/40 rounded-2xl w-full max-w-xl p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                <span>🎨 Customizador de Tema & Conteúdo (Nuvem)</span>
              </h3>
              <button 
                onClick={() => setThemeModalOpen(false)}
                className="text-slate-400 hover:text-white text-xl"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Cor Primária</label>
                  <div className="flex items-center space-x-2">
                    <input 
                      type="color" 
                      value={themeConfig.primaryColor}
                      onChange={(e) => handleSaveTheme({ ...themeConfig, primaryColor: e.target.value })}
                      className="w-10 h-9 rounded cursor-pointer bg-slate-900 border border-slate-700 p-1"
                    />
                    <input 
                      type="text" 
                      value={themeConfig.primaryColor}
                      onChange={(e) => handleSaveTheme({ ...themeConfig, primaryColor: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Cor Secundária</label>
                  <div className="flex items-center space-x-2">
                    <input 
                      type="color" 
                      value={themeConfig.secondaryColor}
                      onChange={(e) => handleSaveTheme({ ...themeConfig, secondaryColor: e.target.value })}
                      className="w-10 h-9 rounded cursor-pointer bg-slate-900 border border-slate-700 p-1"
                    />
                    <input 
                      type="text" 
                      value={themeConfig.secondaryColor}
                      onChange={(e) => handleSaveTheme({ ...themeConfig, secondaryColor: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-800 pt-3">
                <label className="block text-slate-300 font-semibold mb-1">Título do Banner Inicial</label>
                <input 
                  type="text"
                  value={themeConfig.heroTitle}
                  onChange={(e) => handleSaveTheme({ ...themeConfig, heroTitle: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Subtítulo em Destaque</label>
                <input 
                  type="text"
                  value={themeConfig.heroSubtitle}
                  onChange={(e) => handleSaveTheme({ ...themeConfig, heroSubtitle: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-cyan-400 font-bold"
                />
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-800">
                <button 
                  onClick={() => setThemeModalOpen(false)}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg transition"
                >
                  Concluir & Aplicar Tema
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Auth / Admin Modal */}
      {authModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0E1422] border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <button 
              onClick={() => setAuthModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white text-lg"
            >
              ✕
            </button>

            {authMode === 'admin-login' ? (
              <div>
                <h3 className="text-xl font-bold text-white mb-2 flex items-center space-x-2">
                  <span>🔐 Acesso Restrito Full Admin</span>
                </h3>
                <p className="text-xs text-slate-400 mb-4">Digite a senha para gerenciar dados na nuvem e configurar o tema do site.</p>
                {adminAlert && (
                  <div className="mb-4 p-2.5 bg-red-950/80 border border-red-700/80 rounded-lg text-xs text-red-300 font-semibold">
                    {adminAlert}
                  </div>
                )}
                <form onSubmit={handleAdminAuth} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Senha Admin</label>
                    <input 
                      type="password" 
                      placeholder="Senha de acesso admin"
                      value={adminPassInput}
                      onChange={(e) => setAdminPassInput(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#0088FF]"
                      required
                    />
                  </div>
                  <button 
                    type="submit"
                    className="w-full py-3 bg-[#0088FF] hover:bg-blue-600 text-white font-bold text-sm rounded-xl shadow-lg transition"
                  >
                    Entrar no Admin
                  </button>
                </form>
              </div>
            ) : (
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Clube VIP DBARROS TECH</h3>
                <p className="text-xs text-slate-400 mb-6">Receba ofertas exclusivas no WhatsApp e descontos em serviços.</p>
                <form onSubmit={handleRegisterVip} className="space-y-3 text-xs">
                  <input 
                    type="text" 
                    placeholder="Nome Completo"
                    value={signupForm.name}
                    onChange={(e) => setSignupForm({ ...signupForm, name: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#0088FF]"
                    required
                  />
                  <input 
                    type="tel" 
                    placeholder="WhatsApp / Telefone (75) 9XXXX-XXXX"
                    value={signupForm.phone}
                    onChange={(e) => setSignupForm({ ...signupForm, phone: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#0088FF]"
                    required
                  />
                  <button 
                    type="submit"
                    className="w-full py-3 bg-[#0088FF] hover:bg-blue-600 text-white font-bold rounded-xl shadow-lg transition mt-2"
                  >
                    Cadastrar no Clube VIP (Salvar na Nuvem)
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-slate-950 border-t border-slate-800 py-12 px-4 sm:px-6 lg:px-8 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-6">
          <div className="flex items-center space-x-3">
            <span className="font-extrabold text-slate-200 text-base">DBARROS <span style={{ color: themeConfig.primaryColor }}>TECH</span></span>
            <span>• Atendimento em Alagoinhas - BA e Região</span>
          </div>
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => { setAuthMode('admin-login'); setAuthModalOpen(true); }}
              className="hover:text-cyan-400 transition underline"
            >
              Painel Full Admin
            </button>
            <span>© 2026 DBARROS TECH. Todos os direitos reservados.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}