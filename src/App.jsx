import React, { useState, useEffect } from 'react';
import { 
  PlayCircle, BookOpen, Settings, LogOut, ShieldAlert, Lock, 
  Plus, Trash2, Video, ChevronDown, CheckCircle, UserPlus, LogIn, X, Activity, ShieldCheck, Play
} from 'lucide-react';

// ==========================================
// 1. إعدادات Firebase الخاصة بك
// ==========================================
import { initializeApp } from 'firebase/app';
import { 
  getAuth, onAuthStateChanged, createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, signOut 
} from 'firebase/auth';
import { 
  getFirestore, collection, onSnapshot, doc, setDoc, deleteDoc, 
  arrayUnion, arrayRemove 
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCGah4UwLysOMhBQNR6ov9UJMjEUuorVOM",
  authDomain: "video-platform-d99d3.firebaseapp.com",
  projectId: "video-platform-d99d3",
  storageBucket: "video-platform-d99d3.firebasestorage.app",
  messagingSenderId: "31338710927",
  appId: "1:31338710927:web:fa903a6d1804f0b7e4adfa",
  measurementId: "G-RMLF9VC9WR"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const APP_ID = 'video-platform-prod';

// ==========================================
// 2. المكونات الأمنية (العلامة المائية)
// ==========================================

const Watermark = ({ email }) => {
  const [pos, setPos] = useState({ top: '10%', left: '10%' });
  
  useEffect(() => {
    const interval = setInterval(() => {
      setPos({ 
        top: Math.floor(Math.random() * 80 + 5) + '%', 
        left: Math.floor(Math.random() * 80 + 5) + '%' 
      });
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none z-50 select-none overflow-hidden opacity-[0.15]">
      <div 
        className="absolute transition-all duration-[5000ms] ease-in-out text-white font-mono text-[10px] md:text-xs bg-black/40 px-3 py-1.5 rounded-full whitespace-nowrap backdrop-blur-md border border-white/10"
        style={{ top: pos.top, left: pos.left }}
      >
        {email} | {new Date().toLocaleDateString('ar-EG')}
      </div>
    </div>
  );
};

// ==========================================
// 3. التطبيق الرئيسي
// ==========================================
export default function App() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [courses, setCourses] = useState([]);
  const [progress, setProgress] = useState([]);
  
  const [view, setView] = useState('login'); 
  const [activeCourse, setActiveCourse] = useState(null);
  const [activeLesson, setActiveLesson] = useState(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // مراقبة حالة المستخدم وتحديد الأدمن
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser(u);
        const adminEmail = 'lexer626@gmail.com'.toLowerCase().trim();
        setIsAdmin(u.email.toLowerCase().trim() === adminEmail); 
        setView('dashboard');
      } else {
        setUser(null);
        setIsAdmin(false);
        setView('login');
      }
    });
    return () => unsub();
  }, []);

  // جلب البيانات العامة (الدورات)
  useEffect(() => {
    if (!user) return;
    const coursesRef = collection(db, 'artifacts', APP_ID, 'public', 'data', 'courses');
    const unsub = onSnapshot(coursesRef, (snap) => {
      setCourses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [user]);

  // جلب بيانات الطالب الخاصة (التقدم)
  useEffect(() => {
    if (!user || isAdmin) return;
    const progRef = doc(db, 'artifacts', APP_ID, 'users', user.uid, 'settings', 'progress');
    const unsub = onSnapshot(progRef, (d) => {
      if (d.exists()) setProgress(d.data().completed || []);
    });
    return () => unsub();
  }, [user, isAdmin]);

  // وظيفة لتحويل روابط يوتيوب لتعمل داخل المنصة
  const getYoutubeEmbedUrl = (url) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}` : null;
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const cleanEmail = email.toLowerCase().trim();

    try {
      if (isRegister) {
        await createUserWithEmailAndPassword(auth, cleanEmail, password);
      } else {
        await signInWithEmailAndPassword(auth, cleanEmail, password);
      }
    } catch (err) {
      if (err.code === 'auth/invalid-credential') {
        setError('بيانات الدخول غير صحيحة. تأكد من الإيميل وكلمة المرور.');
      } else {
        setError('حدث خطأ في الدخول، يرجى المحاولة مرة أخرى.');
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleLesson = async (lessonId) => {
    if (isAdmin) return;
    const progRef = doc(db, 'artifacts', APP_ID, 'users', user.uid, 'settings', 'progress');
    const isDone = progress.includes(lessonId);
    await setDoc(progRef, {
      completed: isDone ? arrayRemove(lessonId) : arrayUnion(lessonId)
    }, { merge: true });
  };

  const saveCourse = async (courseData) => {
    const ref = doc(db, 'artifacts', APP_ID, 'public', 'data', 'courses', courseData.id);
    await setDoc(ref, courseData);
  };

  const deleteCourse = async (id) => {
    if (window.confirm('هل أنت متأكد من حذف هذه الدورة بالكامل؟')) {
      await deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'courses', id));
    }
  };

  // حقن الخطوط العالمية في التطبيق
  const globalFontStyles = `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Tajawal:wght@300;400;500;700;800;900&display=swap');
    * {
      font-family: 'Tajawal', 'Outfit', sans-serif;
    }
    .glass-effect {
      background: rgba(255, 255, 255, 0.85);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
    }
  `;

  // --- واجهة تسجيل الدخول (Premium UI) ---
  if (view === 'login') {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4 relative overflow-hidden" dir="rtl">
        <style>{globalFontStyles}</style>
        {/* Abstract Background Elements */}
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="glass-effect w-full max-w-[420px] rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)] overflow-hidden border border-white/60 relative z-10 transition-all duration-500 hover:shadow-[0_20px_60px_-15px_rgba(79,70,229,0.15)]">
          <div className="p-10 pb-6 text-center relative">
            <div className="w-20 h-20 bg-gradient-to-tr from-indigo-600 to-blue-500 rounded-[1.5rem] mx-auto mb-6 flex items-center justify-center shadow-lg shadow-indigo-500/30 transform rotate-3 hover:rotate-0 transition-transform duration-500">
              <ShieldCheck size={36} className="text-white" />
            </div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">Pass your <span className="text-indigo-600">license</span></h1>
            <p className="text-slate-500 mt-2 text-sm font-medium">أدخل بياناتك للمتابعة للوصول إلى دروسك</p>
          </div>
          
          <form onSubmit={handleAuth} className="p-8 pt-2 space-y-5">
            {error && <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-xs font-bold border border-red-100 text-center leading-relaxed animate-pulse">{error}</div>}
            
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 mr-1">البريد الإلكتروني</label>
              <div className="relative">
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-4 bg-slate-50/50 hover:bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white text-left transition-all duration-300 font-medium" dir="ltr" placeholder="example@mail.com" required />
              </div>
            </div>

            <div className="space-y-1.5 pb-2">
              <label className="text-xs font-bold text-slate-500 mr-1">كلمة المرور</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-4 bg-slate-50/50 hover:bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white text-left transition-all duration-300 font-medium" dir="ltr" placeholder="••••••••" required />
            </div>

            <button disabled={loading} className="w-full bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white py-4 rounded-2xl font-bold shadow-lg shadow-indigo-500/25 transition-all flex justify-center items-center gap-2 active:scale-[0.98]">
              {loading ? <Activity size={20} className="animate-spin" /> : <LogIn size={20} />}
              {loading ? 'جاري المعالجة...' : (isRegister ? 'إنشاء حساب جديد' : 'تسجيل الدخول')}
            </button>
            
            <div className="pt-2 text-center">
              <button type="button" onClick={() => { setIsRegister(!isRegister); setError(''); }} className="text-slate-500 text-sm font-medium hover:text-indigo-600 transition-colors">
                {isRegister ? 'لديك حساب بالفعل؟ سجل دخولك' : 'لا تملك حساباً؟ أنشئ حساب طالب جديد'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // --- واجهة الأدمن (Modern Dashboard UI) ---
  if (view === 'admin' && isAdmin) {
    return (
      <div className="min-h-screen bg-[#f8fafc] pb-24" dir="rtl">
        <style>{globalFontStyles}</style>
        <header className="glass-effect border-b border-slate-200/60 p-5 px-8 flex justify-between items-center sticky top-0 z-50 shadow-[0_2px_10px_rgb(0,0,0,0.02)]">
           <div className="flex items-center gap-3">
             <button onClick={() => setView('dashboard')} className="text-indigo-600 font-bold bg-indigo-50/50 hover:bg-indigo-100 px-5 py-2.5 rounded-xl transition-all flex items-center gap-2 text-sm">
               <BookOpen size={16} /> معاينة الطالب
             </button>
             <button onClick={() => alert('يتم الحفظ تلقائياً في قاعدة البيانات.')} className="bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-white font-bold px-5 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-2 text-sm shadow-emerald-500/20">
               <CheckCircle size={16}/> تأكيد الحفظ
             </button>
           </div>
           <h1 className="text-xl font-black text-slate-800 tracking-tight">غرفة القيادة <span className="text-indigo-600 opacity-50">|</span> Admin</h1>
        </header>

        <main className="p-6 md:p-10 max-w-5xl mx-auto space-y-8">
          <button 
            onClick={() => {
              const id = Date.now().toString();
              saveCourse({ id, title: 'دورة جديدة', description: 'أضف وصفاً هنا', sections: [] });
            }}
            className="w-full bg-white border-2 border-dashed border-slate-200 p-10 rounded-[2rem] text-slate-400 font-bold hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50/30 transition-all flex items-center justify-center gap-3 shadow-sm group"
          >
            <div className="bg-slate-50 group-hover:bg-indigo-100 p-3 rounded-full transition-colors">
              <Plus size={24} className="group-hover:scale-110 transition-transform" /> 
            </div>
            <span className="text-lg">إضافة دورة تعليمية جديدة</span>
          </button>

          {courses.map(course => (
            <div key={course.id} className="bg-white rounded-[2rem] p-8 lg:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden relative transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
              <div className="flex flex-col md:flex-row justify-between items-start mb-8 gap-4">
                <div className="flex-1 space-y-3 w-full">
                  <input className="text-2xl lg:text-3xl font-black w-full bg-transparent outline-none border-b-2 border-transparent focus:border-indigo-500 pb-1 text-slate-800 transition-colors placeholder:text-slate-300" placeholder="عنوان الدورة..." value={course.title} onChange={e => saveCourse({...course, title: e.target.value})}/>
                  <input className="text-sm font-medium text-slate-500 w-full bg-transparent outline-none px-1 placeholder:text-slate-300" placeholder="اكتب وصفاً مختصراً للدورة..." value={course.description} onChange={e => saveCourse({...course, description: e.target.value})}/>
                </div>
                <div className="flex items-center gap-2">
                   <button onClick={() => deleteCourse(course.id)} className="text-red-400 bg-red-50 p-3 hover:bg-red-500 hover:text-white rounded-xl transition-all shadow-sm"><Trash2 size={20}/></button>
                </div>
              </div>

              <div className="space-y-6 pt-8 border-t border-slate-100/80">
                <div className="flex justify-between items-center mb-6">
                   <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                     <BookOpen size={18} className="text-indigo-500" /> هيكل المحتوى
                   </h3>
                   <button onClick={() => {
                     const sections = [...(course.sections||[]), {id: Date.now().toString(), title: 'قسم جديد', lessons: []}];
                     saveCourse({...course, sections});
                   }} className="text-xs bg-slate-900 text-white hover:bg-indigo-600 px-5 py-2.5 rounded-xl font-bold transition-colors shadow-md">إضافة قسم +</button>
                </div>

                {course.sections?.map((section, idx) => (
                  <div key={section.id} className="bg-slate-50/50 p-6 lg:p-8 rounded-3xl border border-slate-200/60 shadow-sm relative">
                    <div className="absolute top-6 left-6 text-slate-200 font-black text-4xl opacity-50 pointer-events-none">{idx + 1}</div>
                    <input className="font-black text-lg text-slate-800 bg-transparent outline-none w-full mb-6 border-b-2 border-slate-200 pb-2 focus:border-indigo-500 transition-colors placeholder:text-slate-400" placeholder="عنوان القسم..." value={section.title} onChange={e => {
                      const sections = course.sections.map(s => s.id === section.id ? {...s, title: e.target.value} : s);
                      saveCourse({...course, sections});
                    }}/>
                    
                    <div className="space-y-3">
                      {section.lessons?.map((lesson, lIdx) => (
                        <div key={lesson.id} className="flex flex-col md:flex-row gap-3 items-center bg-white p-3 rounded-2xl shadow-sm border border-slate-100 hover:border-indigo-200 transition-colors group">
                          <div className="bg-indigo-50 text-indigo-600 p-2.5 rounded-xl hidden md:block">
                            <Video size={18} />
                          </div>
                          <input className="w-full md:flex-[2] p-2.5 text-sm outline-none font-bold text-slate-700 bg-transparent" value={lesson.title} placeholder="عنوان الفيديو..." onChange={e => {
                            const sections = course.sections.map(s => s.id === section.id ? {...s, lessons: s.lessons.map(l => l.id === lesson.id ? {...l, title: e.target.value} : l)} : s);
                            saveCourse({...course, sections});
                          }}/>
                          <input className="w-full md:flex-[4] p-2.5 text-xs outline-none font-mono text-indigo-600 bg-slate-50 focus:bg-indigo-50/50 rounded-xl border border-transparent focus:border-indigo-200 transition-colors" value={lesson.videoUrl} placeholder="رابط MP4 أو YouTube" dir="ltr" onChange={e => {
                            const sections = course.sections.map(s => s.id === section.id ? {...s, lessons: s.lessons.map(l => l.id === lesson.id ? {...l, videoUrl: e.target.value} : l)} : s);
                            saveCourse({...course, sections});
                          }}/>
                          <button onClick={() => {
                            const sections = course.sections.map(s => s.id === section.id ? {...s, lessons: s.lessons.filter(l => l.id !== lesson.id)} : s);
                            saveCourse({...course, sections});
                          }} className="w-full md:w-auto text-red-300 hover:text-white hover:bg-red-500 p-2.5 rounded-xl transition-colors flex justify-center"><Trash2 size={16}/></button>
                        </div>
                      ))}
                      <button onClick={() => {
                        const sections = course.sections.map(s => s.id === section.id ? {...s, lessons: [...(s.lessons||[]), {id: Date.now().toString(), title: 'درس جديد', videoUrl: ''}]} : s);
                        saveCourse({...course, sections});
                      }} className="text-xs text-indigo-600 font-bold mt-4 hover:bg-indigo-50 px-4 py-2.5 rounded-xl transition-colors flex items-center gap-2 border border-indigo-100 bg-white shadow-sm">
                        <Plus size={16}/> إضافة فيديو لهذا القسم
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </main>
      </div>
    );
  }

  // --- واجهة مشاهدة الفيديو (Cinematic Player UI) ---
  if (view === 'video' && activeCourse && activeLesson) {
    const youtubeUrl = getYoutubeEmbedUrl(activeLesson.videoUrl);

    return (
      <div className="h-screen flex flex-col bg-[#0B0F19]" dir="rtl">
        <style>{globalFontStyles}</style>
        <header className="p-5 border-b border-white/5 flex justify-between items-center bg-[#0F1523] shadow-lg z-20">
          <button onClick={() => setView('dashboard')} className="text-indigo-400 font-bold flex items-center gap-2 hover:text-white transition-colors bg-white/5 px-4 py-2 rounded-xl">
            &rarr; العودة للمسارات
          </button>
          <div className="text-right">
            <h1 className="font-bold text-white text-lg line-clamp-1">{activeLesson.title}</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{activeCourse.title}</p>
          </div>
        </header>
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
          {/* Video Area */}
          <div className="flex-1 relative flex items-center justify-center border-l border-white/5 bg-black overflow-hidden group">
            <Watermark email={user.email} />
            
            {youtubeUrl ? (
              <iframe 
                src={youtubeUrl} 
                className="w-full h-full shadow-2xl" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowFullScreen
              ></iframe>
            ) : activeLesson.videoUrl ? (
              <video src={activeLesson.videoUrl} controls controlsList="nodownload" className="max-h-full w-full object-contain shadow-2xl" onContextMenu={e => e.preventDefault()} />
            ) : (
              <div className="text-center space-y-5 opacity-20">
                 <Video size={80} className="text-white mx-auto animate-pulse" />
                 <p className="text-white font-bold tracking-wide">رابط الفيديو غير متوفر حالياً</p>
              </div>
            )}
          </div>
          
          {/* Playlist Sidebar */}
          <div className="w-full lg:w-[380px] border-r border-white/5 overflow-y-auto p-6 bg-[#0F1523] space-y-8 z-10 custom-scrollbar">
            <h2 className="font-black text-white text-lg border-b border-white/10 pb-4 flex items-center gap-2">
              <BookOpen size={20} className="text-indigo-500" /> قائمة الدروس
            </h2>
            {activeCourse.sections?.map(s => (
              <div key={s.id} className="space-y-4">
                <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div> {s.title}
                </h3>
                <div className="space-y-2.5">
                  {s.lessons?.map(l => (
                    <button 
                      key={l.id} 
                      onClick={() => setActiveLesson(l)} 
                      className={`w-full text-right p-4 rounded-2xl text-sm transition-all flex items-center gap-3 border ${activeLesson.id === l.id ? 'bg-indigo-600/10 border-indigo-500/50 text-white shadow-[0_0_20px_rgba(79,70,229,0.15)]' : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10 hover:text-white'}`}
                    >
                      {progress.includes(l.id) ? (
                        <CheckCircle size={18} className="text-emerald-400 flex-shrink-0"/>
                      ) : (
                        <Play size={16} className={`flex-shrink-0 ${activeLesson.id === l.id ? 'text-indigo-400' : 'opacity-40'}`} fill={activeLesson.id === l.id ? 'currentColor' : 'none'}/>
                      )}
                      <span className="flex-1 truncate font-medium">{l.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
            
            {!isAdmin && (
              <div className="pt-6 border-t border-white/10">
                <button onClick={() => toggleLesson(activeLesson.id)} className={`w-full py-4 rounded-2xl font-bold shadow-xl transition-all flex items-center justify-center gap-2 active:scale-95 ${progress.includes(activeLesson.id) ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-indigo-600 text-white hover:bg-indigo-500 border border-indigo-500'}`}>
                  <CheckCircle size={20}/>
                  {progress.includes(activeLesson.id) ? 'تم إكمال المشاهدة' : 'تحديد كـ مكتمل'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- الواجهة الرئيسية للطلاب (Premium Dashboard) ---
  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans" dir="rtl">
      <style>{globalFontStyles}</style>
      {isAdmin && (
        <div className="bg-[#0B0F19] text-white p-3 text-center text-xs font-bold flex justify-center items-center gap-4 border-b border-indigo-500/30 shadow-md relative z-50">
          <ShieldCheck size={16} className="text-emerald-400" />
          <span className="tracking-wide">وضع المدير مفعل - أنت تتصفح كآدمن</span>
          <button onClick={() => setView('admin')} className="text-indigo-400 hover:text-white transition-colors bg-white/10 px-3 py-1 rounded-lg ml-2">
            انتقال للوحة التحكم &rarr;
          </button>
        </div>
      )}
      
      <header className="glass-effect border-b border-slate-200/60 p-5 md:px-12 flex justify-between items-center sticky top-0 z-40 shadow-[0_2px_15px_rgb(0,0,0,0.03)]">
        <button onClick={() => auth.signOut()} className="text-slate-500 hover:text-red-600 flex items-center gap-2 text-sm font-bold bg-white border border-slate-200 px-5 py-2.5 rounded-xl hover:bg-red-50 hover:border-red-200 transition-all active:scale-95 shadow-sm">
          <LogOut size={18}/> تسجيل خروج
        </button>
        <div className="flex items-center gap-4">
           <div className="text-right hidden md:block">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">مرحباً بك مجدداً</p>
              <p className="text-sm font-bold text-slate-800">{user.email ? user.email.split('@')[0] : 'User'}</p>
           </div>
           <div className="w-12 h-12 bg-gradient-to-tr from-indigo-600 to-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30 text-white">
              <ShieldAlert size={24}/>
           </div>
        </div>
      </header>

      <main className="p-6 md:p-12 lg:p-20 max-w-[1400px] mx-auto relative">
        <div className="mb-16 text-center sm:text-right relative z-10">
          <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-4 tracking-tight">Pass your <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-500 underline decoration-indigo-200/50 decoration-4 underline-offset-8">license</span></h2>
          <p className="text-slate-500 text-lg font-medium tracking-tight">منصتك الموثوقة للتعليم الاحترافي والمستمر.</p>
        </div>

        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-8 md:gap-10 relative z-10">
          {courses.map(course => {
             // حساب التقدم
             let total = 0; let done = 0;
             course.sections?.forEach(s => {
               total += (s.lessons?.length || 0);
               s.lessons?.forEach(l => { if(progress.includes(l.id)) done++; });
             });
             const percent = total > 0 ? Math.round((done/total)*100) : 0;

             return (
               <div key={course.id} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] hover:-translate-y-1.5 transition-all duration-500 overflow-hidden flex flex-col group">
                 <div className="h-52 bg-gradient-to-br from-indigo-600 to-blue-600 flex items-center justify-center relative overflow-hidden">
                   <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-all duration-700"></div>
                   {/* Abstract background for card header */}
                   <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                   <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-black/10 rounded-full blur-xl"></div>
                   
                   <BookOpen size={70} className="text-white/30 group-hover:text-white/50 group-hover:scale-110 transition-all duration-700 relative z-10" />
                   
                   {percent === 100 && (
                     <div className="absolute top-5 right-5 bg-white/20 backdrop-blur-md border border-white/30 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 z-20">
                       <CheckCircle size={14}/> دورة مكتملة
                     </div>
                   )}
                 </div>
                 
                 <div className="p-8 flex-1 flex flex-col bg-white relative">
                   <h3 className="font-black text-2xl mb-3 text-slate-800 group-hover:text-indigo-600 transition-colors leading-tight line-clamp-1">{course.title}</h3>
                   <p className="text-sm text-slate-500 flex-1 leading-relaxed line-clamp-2 font-medium">{course.description}</p>
                   
                   <div className="mt-8 mb-8">
                      <div className="flex justify-between text-xs font-bold text-slate-400 mb-2.5">
                        <span>نسبة الإنجاز</span>
                        <span className="text-indigo-600">{percent}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div className="bg-gradient-to-r from-indigo-600 to-blue-500 h-full rounded-full transition-all duration-1000 ease-out relative" style={{ width: `${percent}%` }}>
                          <div className="absolute top-0 right-0 bottom-0 left-0 bg-white/20 animate-pulse"></div>
                        </div>
                      </div>
                   </div>

                   <button 
                     onClick={() => {
                       const first = course.sections?.[0]?.lessons?.[0];
                       if (first) {
                         setActiveCourse(course);
                         setActiveLesson(first);
                         setView('video');
                       } else { alert('يرجى الانتظار، لم يتم إضافة محتوى لهذه الدورة بعد.'); }
                     }}
                     className="w-full bg-slate-50 hover:bg-indigo-600 text-indigo-700 hover:text-white border border-slate-200 hover:border-indigo-600 py-4 rounded-2xl font-bold shadow-sm hover:shadow-xl hover:shadow-indigo-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                   >
                     {percent > 0 ? (
                       <>متابعة التعلم <PlayCircle size={18}/></>
                     ) : (
                       <>ابدأ المشاهدة الآن <Play size={18}/></>
                     )}
                   </button>
                 </div>
               </div>
             );
          })}
          
          {courses.length === 0 && (
            <div className="col-span-full py-32 text-center bg-white/50 backdrop-blur-sm rounded-[3rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center">
               <div className="w-20 h-20 bg-white shadow-sm rounded-full flex items-center justify-center mb-6">
                 <Video size={36} className="text-slate-300" />
               </div>
               <p className="text-slate-800 font-black text-2xl mb-2">مكتبة الدورات فارغة</p>
               <p className="text-slate-500 font-medium">سيتم مزامنة المحتوى الجديد هنا قريباً.</p>
            </div>
          )}
        </div>
      </main>

      <style>{`
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #0F1523; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; }
      `}</style>
    </div>
  );
}
