import React, { useState, useEffect } from 'react';
import { 
  PlayCircle, BookOpen, Settings, LogOut, ShieldAlert, Lock, 
  Plus, Trash2, Video, ChevronDown, CheckCircle, UserPlus, LogIn, X, Activity, ShieldCheck
} from 'lucide-react';

// ==========================================
// 1. إعدادات Firebase (مشروع صهيب المعتمد)
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
const APP_ID = 'academy-master-v1';

// ==========================================
// 2. المكونات الأمنية (Moving Watermark)
// ==========================================
const Watermark = ({ email }) => {
  const [pos, setPos] = useState({ top: '20%', left: '20%' });
  useEffect(() => {
    const interval = setInterval(() => {
      setPos({ 
        top: Math.floor(Math.random() * 70 + 10) + '%', 
        left: Math.floor(Math.random() * 70 + 10) + '%' 
      });
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none z-50 select-none overflow-hidden opacity-20">
      <div 
        className="absolute transition-all duration-[4000ms] ease-in-out text-white font-mono text-[10px] sm:text-xs bg-black/40 px-3 py-1 rounded-full shadow-lg"
        style={{ top: pos.top, left: pos.left }}
      >
        ACCESS CONTROL | {email} | {new Date().toLocaleDateString('ar-EG')}
      </div>
    </div>
  );
};

// ==========================================
// 3. التطبيق الرئيسي (Main Engine)
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

  // مراقبة حالة الـ Session وتحديد الصلاحيات
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser(u);
        // التعديل الجوهري: بريد صهيب هو الآدمن الوحيد
        const adminEmail = 'lexer626@gmail.com'.toLowerCase();
        setIsAdmin(u.email.toLowerCase() === adminEmail); 
        setView('dashboard');
      } else {
        setUser(null);
        setIsAdmin(false);
        setView('login');
      }
    });
    return () => unsub();
  }, []);

  // جلب المحتوى الدراسي (Real-time Database Sync)
  useEffect(() => {
    if (!user) return;
    const coursesRef = collection(db, 'artifacts', APP_ID, 'public', 'data', 'courses');
    const unsub = onSnapshot(coursesRef, (snap) => {
      setCourses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.error("Firestore Error:", err));
    return () => unsub();
  }, [user]);

  // جلب تقدم الطالب (Private User Data)
  useEffect(() => {
    if (!user || isAdmin) return;
    const progRef = doc(db, 'artifacts', APP_ID, 'users', user.uid, 'settings', 'progress');
    const unsub = onSnapshot(progRef, (d) => {
      if (d.exists()) setProgress(d.data().completed || []);
    });
    return () => unsub();
  }, [user, isAdmin]);

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isRegister) {
        // إنشاء حساب جديد (يجب عمل هذه الخطوة أولاً لإيميل lexer626)
        await createUserWithEmailAndPassword(auth, email.trim(), password);
      } else {
        // تسجيل دخول عادي
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
    } catch (err) {
      console.error(err.code);
      if (err.code === 'auth/user-not-found') {
        setError('هذا البريد غير مسجل. يرجى الضغط على "أنشئ حساب طالب جديد" بالأسفل أولاً.');
      } else if (err.code === 'auth/wrong-password') {
        setError('كلمة المرور غير صحيحة، يرجى المحاولة مرة أخرى.');
      } else if (err.code === 'auth/invalid-email') {
        setError('تنسيق البريد الإلكتروني غير صحيح.');
      } else {
        setError(`خطأ: ${err.message}`);
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
    if (window.confirm('🚨 هل أنت متأكد من حذف الدورة بالكامل؟')) {
      await deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'courses', id));
    }
  };

  // --- واجهة تسجيل الدخول (Premium High-End UI) ---
  if (view === 'login') {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6" dir="rtl">
        <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 transition-all hover:shadow-indigo-500/10">
          <div className="bg-[#1e293b] p-12 text-center text-white relative">
            <div className="w-20 h-20 bg-indigo-600 rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-lg shadow-indigo-500/30">
               <ShieldCheck size={40} className="text-white" />
            </div>
            <h1 className="text-2xl font-black tracking-tight mb-2">أكاديمية التعليم الآمن</h1>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Medical Learning Hub</p>
          </div>
          
          <form onSubmit={handleAuth} className="p-10 space-y-6">
            {error && <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-xs font-bold border border-red-100 text-center leading-relaxed">{error}</div>}
            
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 mr-2 uppercase tracking-widest">البريد الإلكتروني</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 ring-indigo-500 text-left transition-all" dir="ltr" placeholder="lexer626@gmail.com" required />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 mr-2 uppercase tracking-widest">كلمة المرور</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 ring-indigo-500 text-left transition-all" dir="ltr" placeholder="••••••••" required />
            </div>

            <button disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-black shadow-xl shadow-indigo-100 transition-all flex justify-center items-center gap-3 active:scale-95 disabled:opacity-50">
              {loading ? <Activity className="animate-spin" size={20} /> : <LogIn size={20} />}
              {loading ? 'Processing...' : (isRegister ? 'إنشاء حساب جديد' : 'دخول آمن للمنصة')}
            </button>
            
            <button type="button" onClick={() => { setIsRegister(!isRegister); setError(''); }} className="w-full text-slate-500 text-xs font-bold hover:text-indigo-600 transition-colors uppercase">
              {isRegister ? 'لديك حساب بالفعل؟ سجل دخولك' : 'لا تملك حساباً؟ أنشئ حساب طالب جديد'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- واجهة الأدمن (للأستاذ صهيب فقط) ---
  if (view === 'admin' && isAdmin) {
    return (
      <div className="min-h-screen bg-[#f8fafc] pb-32" dir="rtl">
        <header className="bg-white border-b p-6 px-10 flex justify-between items-center sticky top-0 z-50 backdrop-blur-md bg-white/80">
           <button onClick={() => setView('dashboard')} className="text-indigo-600 font-black text-xs flex items-center gap-2 bg-indigo-50 px-5 py-2.5 rounded-2xl hover:bg-indigo-100 transition-all">
              معاينة كطالب <BookOpen size={16}/>
           </button>
           <h1 className="text-xl font-black text-slate-800 tracking-tighter uppercase">لوحة تحكم المدير</h1>
        </header>

        <main className="p-8 max-w-5xl mx-auto space-y-10">
          <button 
            onClick={() => {
              const id = Date.now().toString();
              saveCourse({ id, title: 'دورة جديدة', description: 'أضف وصفاً هنا..', sections: [] });
            }}
            className="w-full bg-white border-2 border-dashed border-slate-200 p-12 rounded-[3rem] text-slate-400 font-bold hover:border-indigo-400 hover:text-indigo-500 transition-all flex items-center justify-center gap-4 shadow-sm group"
          >
            <Plus size={32} className="group-hover:scale-110 transition-transform" /> إضافة دورة تعليمية جديدة للمنصة
          </button>

          {courses.map(course => (
            <div key={course.id} className="bg-white rounded-[3rem] p-10 shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden relative">
              <div className="flex justify-between items-start mb-8">
                <div className="flex-1 space-y-3">
                  <input className="text-2xl font-black w-full outline-none border-b-2 border-transparent focus:border-indigo-400 pb-1 text-slate-800" value={course.title} onChange={e => saveCourse({...course, title: e.target.value})}/>
                  <input className="text-sm text-slate-400 font-bold w-full outline-none px-2" value={course.description} onChange={e => saveCourse({...course, description: e.target.value})}/>
                </div>
                <button onClick={() => deleteCourse(course.id)} className="text-red-300 p-4 hover:bg-red-50 hover:text-red-500 rounded-2xl transition-all"><Trash2 size={24}/></button>
              </div>

              <div className="space-y-6 pt-8 border-t border-slate-50">
                <div className="flex justify-between items-center mb-4">
                   <h3 className="font-black text-slate-700 text-sm uppercase tracking-widest italic">Curriculum Builder</h3>
                   <button onClick={() => {
                     const sections = [...(course.sections||[]), {id: Date.now().toString(), title: 'عنوان القسم الجديد', lessons: []}];
                     saveCourse({...course, sections});
                   }} className="text-xs bg-indigo-600 text-white px-5 py-2.5 rounded-2xl font-black shadow-lg shadow-indigo-100 active:scale-95 transition-all">إضافة قسم +</button>
                </div>

                {course.sections?.map(section => (
                  <div key={section.id} className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100">
                    <input className="font-black text-slate-900 bg-transparent outline-none w-full mb-6 border-b border-slate-200 pb-2 focus:border-indigo-400 transition-all" value={section.title} onChange={e => {
                      const sections = course.sections.map(s => s.id === section.id ? {...s, title: e.target.value} : s);
                      saveCourse({...course, sections});
                    }}/>
                    
                    <div className="space-y-4">
                      {section.lessons?.map(lesson => (
                        <div key={lesson.id} className="flex gap-4 items-center bg-white p-4 rounded-3xl shadow-sm border border-slate-100">
                          <input className="flex-[2] p-2 text-sm outline-none font-black text-slate-700" value={lesson.title} placeholder="عنوان الفيديو" onChange={e => {
                            const sections = course.sections.map(s => s.id === section.id ? {...s, lessons: s.lessons.map(l => l.id === lesson.id ? {...l, title: e.target.value} : l)} : s);
                            saveCourse({...course, sections});
                          }}/>
                          <input className="flex-[4] p-3 text-[11px] outline-none font-mono text-indigo-600 bg-slate-50 rounded-xl" value={lesson.videoUrl} placeholder="Direct MP4 URL" dir="ltr" onChange={e => {
                            const sections = course.sections.map(s => s.id === section.id ? {...s, lessons: s.lessons.map(l => l.id === lesson.id ? {...l, videoUrl: e.target.value} : l)} : s);
                            saveCourse({...course, sections});
                          }}/>
                          <button onClick={() => {
                            const sections = course.sections.map(s => s.id === section.id ? {...s, lessons: s.lessons.filter(l => l.id !== lesson.id)} : s);
                            saveCourse({...course, sections});
                          }} className="text-red-200 hover:text-red-500 p-2 transition-colors"><Trash2 size={18}/></button>
                        </div>
                      ))}
                      <button onClick={() => {
                        const sections = course.sections.map(s => s.id === section.id ? {...s, lessons: [...(s.lessons||[]), {id: Date.now().toString(), title: 'درس جديد', videoUrl: ''}]} : s);
                        saveCourse({...course, sections});
                      }} className="text-xs text-indigo-600 font-black mt-4 hover:bg-white px-5 py-3 rounded-2xl transition-all border border-indigo-100 inline-flex items-center gap-2 shadow-sm">
                        <Plus size={16}/> أضف فيديو لهذا القسم
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

  // --- واجهة مشغل الفيديو (Immersive Player) ---
  if (view === 'video' && activeCourse && activeLesson) {
    return (
      <div className="h-screen flex flex-col bg-[#0f172a] font-sans" dir="rtl">
        <header className="p-4 border-b border-slate-800 flex justify-between items-center bg-[#1e293b] shadow-2xl z-10">
          <button onClick={() => setView('dashboard')} className="text-indigo-400 font-black text-sm flex items-center gap-2 hover:text-indigo-300 transition-all bg-white/5 px-6 py-2 rounded-full border border-white/5 shadow-inner">
            &rarr; EXIT PLAYER
          </button>
          <div className="text-right">
            <h1 className="font-black text-white text-lg line-clamp-1 italic tracking-tight">{activeLesson.title}</h1>
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">{activeCourse.title}</p>
          </div>
        </header>
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
          <div className="flex-1 relative flex items-center justify-center bg-black overflow-hidden border-l border-slate-800 group">
            <Watermark email={user.email} />
            {activeLesson.videoUrl ? (
              <video src={activeLesson.videoUrl} controls controlsList="nodownload" className="max-h-full w-full object-contain shadow-2xl shadow-indigo-500/10" onContextMenu={e => e.preventDefault()} />
            ) : (
              <div className="text-center space-y-6 opacity-20 group-hover:opacity-50 transition-opacity duration-1000">
                 <Video size={100} className="text-white mx-auto animate-pulse" />
                 <p className="text-white font-black text-xl uppercase tracking-widest italic">Video Stream Not Found</p>
              </div>
            )}
          </div>
          <div className="w-full lg:w-96 border-r border-slate-800 overflow-y-auto p-10 bg-[#1e293b] space-y-10 shadow-2xl">
            <h2 className="font-black text-white text-xl border-b border-slate-700 pb-5 uppercase italic tracking-tighter">Course Content</h2>
            {activeCourse.sections?.map(s => (
              <div key={s.id} className="space-y-5">
                <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2 italic">
                   <div className="w-1.5 h-3 bg-indigo-500 rounded-full"></div> {s.title}
                </h3>
                <div className="space-y-3">
                  {s.lessons?.map(l => (
                    <button 
                      key={l.id} 
                      onClick={() => setActiveLesson(l)} 
                      className={`w-full text-right p-6 rounded-[1.8rem] text-sm transition-all flex items-center gap-5 border-2 ${activeLesson.id === l.id ? 'bg-indigo-600 border-indigo-400 text-white shadow-2xl' : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10 hover:text-white'}`}
                    >
                      {progress.includes(l.id) ? <CheckCircle size={22} className="text-emerald-400 shadow-sm"/> : <PlayCircle size={22} className="opacity-30"/>}
                      <span className="flex-1 font-black leading-tight tracking-tight uppercase">{l.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
            
            {!isAdmin && (
              <button onClick={() => toggleLesson(activeLesson.id)} className={`w-full mt-12 py-7 rounded-[2.5rem] font-black shadow-2xl transition-all flex items-center justify-center gap-5 border-2 active:scale-95 ${progress.includes(activeLesson.id) ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-indigo-600 text-white border-indigo-400 hover:bg-indigo-500'}`}>
                <CheckCircle size={28}/>
                <span className="uppercase tracking-widest">{progress.includes(activeLesson.id) ? 'الدرس مكتمل' : 'تحديد كـ مكتمل'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- الواجهة الرئيسية (Student Dashboard) ---
  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans" dir="rtl">
      {isAdmin && (
        <div className="bg-[#0f172a] text-white p-4 text-center text-[11px] font-black flex justify-center gap-8 border-b border-indigo-500/30 relative z-[60] shadow-xl">
          <span className="opacity-40 uppercase tracking-[0.3em] italic font-serif">Main Admin Active Session</span>
          <button onClick={() => setView('admin')} className="text-indigo-400 hover:text-white transition-colors flex items-center gap-3 font-black uppercase underline decoration-indigo-500/50 underline-offset-4 tracking-widest decoration-2">
            <Settings size={14} className="animate-spin-slow"/> Open Dashboard
          </button>
        </div>
      )}
      
      <header className="bg-white/80 border-b border-slate-100 p-8 md:px-16 flex justify-between items-center sticky top-0 z-50 backdrop-blur-xl shadow-sm">
        <button onClick={() => auth.signOut()} className="text-red-500 flex items-center gap-3 text-[11px] font-black bg-red-50 px-7 py-3 rounded-full hover:bg-red-500 hover:text-white transition-all active:scale-95 border border-red-100">
          <LogOut size={16}/> SIGN OUT
        </button>
        <div className="flex items-center gap-6">
           <div className="text-right hidden sm:block leading-tight">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-1 italic">Authorized Access</p>
              <p className="text-sm font-black text-slate-900 tracking-tighter uppercase">{user.email.split('@')[0]}</p>
           </div>
           <div className="w-14 h-14 bg-indigo-600 rounded-[1.4rem] flex items-center justify-center shadow-xl shadow-indigo-600/20 rotate-3 transform hover:rotate-0 transition-all duration-500">
              <ShieldAlert className="text-white" size={32}/>
           </div>
        </div>
      </header>

      <main className="p-10 md:p-24 max-w-7xl mx-auto relative">
        <div className="mb-24 text-center sm:text-right relative">
          <h2 className="text-6xl font-black text-slate-900 mb-6 tracking-tighter leading-tight italic">أكاديمية <span className="text-indigo-600 underline decoration-indigo-200 decoration-8 underline-offset-8">صهيب</span></h2>
          <p className="text-slate-400 text-2xl font-bold max-w-2xl sm:mr-0 mr-auto leading-relaxed tracking-tight opacity-80 uppercase italic font-mono tracking-tighter">Professional Hub for Advanced Medical Education.</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-16">
          {courses.map(course => {
             let total = 0; let done = 0;
             course.sections?.forEach(s => {
               total += (s.lessons?.length || 0);
               s.lessons?.forEach(l => { if(progress.includes(l.id)) done++; });
             });
             const percent = total > 0 ? Math.round((done/total)*100) : 0;

             return (
               <div key={course.id} className="bg-white rounded-[4rem] border border-slate-100 shadow-[0_40px_100px_-30px_rgba(0,0,0,0.08)] hover:shadow-[0_60px_120px_-20px_rgba(79,70,229,0.15)] hover:-translate-y-4 transition-all duration-700 overflow-hidden flex flex-col group relative">
                 <div className="h-64 bg-indigo-600 flex items-center justify-center relative overflow-hidden">
                   <div className="absolute inset-0 bg-gradient-to-br from-black/20 to-transparent group-hover:opacity-0 transition-opacity duration-700"></div>
                   <BookOpen size={100} className="text-white/20 group-hover:scale-125 transition-transform duration-[1500ms] ease-out drop-shadow-2xl" />
                   {percent === 100 && (
                     <div className="absolute top-10 right-10 bg-emerald-500 text-white text-[10px] font-black px-5 py-2 rounded-full shadow-2xl flex items-center gap-2 border border-white/20 uppercase tracking-widest italic">
                       <CheckCircle size={14}/> Complete
                     </div>
                   )}
                 </div>
                 <div className="p-16 flex-1 flex flex-col">
                   <h3 className="font-black text-2xl mb-4 text-slate-900 group-hover:text-indigo-600 transition-colors leading-tight tracking-tight uppercase">{course.title}</h3>
                   <p className="text-sm text-slate-400 flex-1 leading-relaxed line-clamp-3 font-bold mb-10 italic opacity-60 tracking-tight">{course.description}</p>
                   
                   <div className="mb-10">
                      <div className="flex justify-between text-[10px] font-black text-slate-500 mb-3 uppercase tracking-[0.2em] font-mono">
                        <span className="italic">Progress Sync</span>
                        <span className="text-indigo-600 font-black">{percent}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden shadow-inner border border-slate-50">
                        <div className="bg-indigo-600 h-full rounded-full transition-all duration-[1500ms] ease-out shadow-lg shadow-indigo-500/50" style={{ width: `${percent}%` }}></div>
                      </div>
                   </div>

                   <button 
                     onClick={() => {
                       const first = course.sections?.[0]?.lessons?.[0];
                       if (first) {
                         setActiveCourse(course);
                         setActiveLesson(first);
                         setView('video');
                       } else { alert('Coming Soon! This course content is being synchronized by the master administrator.'); }
                     }}
                     className="w-full bg-[#1e293b] hover:bg-indigo-600 text-white py-6 rounded-[2rem] font-black shadow-[0_20px_40px_-10px_rgba(30,41,59,0.3)] hover:shadow-indigo-500/30 transition-all active:scale-95 uppercase tracking-[0.2em] italic"
                   >
                     {percent > 0 ? 'Resume Study' : 'Enter Academy'}
                   </button>
                 </div>
               </div>
             );
          })}
          {courses.length === 0 && (
            <div className="col-span-full py-48 text-center bg-white rounded-[5rem] border-4 border-dashed border-slate-100 flex flex-col items-center gap-10 shadow-inner">
               <div className="w-28 h-28 bg-slate-50 rounded-[3rem] flex items-center justify-center shadow-sm">
                  <Video size={48} className="text-slate-200 animate-pulse" />
               </div>
               <div className="space-y-3">
                 <p className="text-slate-400 font-black text-3xl tracking-tighter uppercase italic opacity-40">Library Hub Empty</p>
                 <p className="text-slate-300 text-[11px] font-black uppercase tracking-[0.4em] tracking-widest opacity-60 font-mono">System Initializing with Primary Server</p>
               </div>
            </div>
          )}
        </div>
      </main>

      <style>{`
        @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin-slow { animation: spin-slow 8s linear infinite; }
      `}</style>
    </div>
  );
}
