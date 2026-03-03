import React, { useState, useEffect } from 'react';
import { 
  PlayCircle, BookOpen, Settings, LogOut, ShieldAlert, Lock, 
  Plus, Trash2, Video, ChevronDown, CheckCircle, UserPlus, LogIn, X 
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
const APP_ID = 'video-platform-v1';

// ==========================================
// 2. المكونات الأمنية (العلامة المائية)
// ==========================================
const Watermark = ({ email }) => {
  const [pos, setPos] = useState({ top: '20%', left: '20%' });
  useEffect(() => {
    const interval = setInterval(() => {
      setPos({ 
        top: Math.floor(Math.random() * 70 + 10) + '%', 
        left: Math.floor(Math.random() * 70 + 10) + '%' 
      });
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none z-50 select-none overflow-hidden opacity-25">
      <div 
        className="absolute transition-all duration-[3000ms] ease-in-out text-white font-mono text-xs bg-black/30 px-3 py-1 rounded-full shadow-lg"
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
        // التعديل هنا: التأكد من بريدك الخاص بغض النظر عن حالة الأحرف
        const adminEmail = 'lexer626@gmail.com'.toLowerCase();
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

  // جلب الدورات
  useEffect(() => {
    if (!user) return;
    const coursesRef = collection(db, 'artifacts', APP_ID, 'public', 'data', 'courses');
    const unsub = onSnapshot(coursesRef, (snap) => {
      setCourses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.log("Firestore Error:", err));
    return () => unsub();
  }, [user]);

  // جلب التقدم
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
    const targetEmail = email.toLowerCase().trim();

    try {
      if (isRegister) {
        await createUserWithEmailAndPassword(auth, targetEmail, password);
      } else {
        await signInWithEmailAndPassword(auth, targetEmail, password);
      }
    } catch (err) {
      // إصلاح مشكلة الخطأ auth/invalid-credential بشرح بسيط
      if (err.code === 'auth/invalid-credential') {
        setError('بيانات الدخول غير صحيحة. تأكد من كلمة المرور أو أنك قمت بإنشاء الحساب أولاً.');
      } else if (err.code === 'auth/user-not-found') {
        setError('هذا الحساب غير موجود. يرجى إنشاء حساب جديد أولاً.');
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
    if (window.confirm('هل تريد حذف هذه الدورة نهائياً؟')) {
      await deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'courses', id));
    }
  };

  // --- واجهة تسجيل الدخول ---
  if (view === 'login') {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100">
          <div className="bg-[#1e293b] p-10 text-center text-white relative">
            <ShieldAlert size={56} className="text-indigo-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold tracking-tight">المنصة التعليمية الآمنة</h1>
            <p className="text-slate-400 mt-2 text-sm italic uppercase tracking-widest">Secure Access Hub</p>
          </div>
          <form onSubmit={handleAuth} className="p-10 space-y-6">
            {error && <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-xs font-bold border border-red-100 text-center">{error}</div>}
            
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 mr-2 uppercase tracking-widest leading-none">البريد الإلكتروني</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 ring-indigo-500 text-left transition-all" dir="ltr" placeholder="student@example.com" required />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 mr-2 uppercase tracking-widest leading-none">كلمة المرور</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 ring-indigo-500 text-left transition-all" dir="ltr" placeholder="••••••••" required />
            </div>

            <button disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-bold shadow-xl shadow-indigo-100 transition-all flex justify-center items-center gap-2 active:scale-95">
              {loading ? 'جاري التحقق...' : (isRegister ? 'إنشاء حساب جديد' : 'دخول آمن للمنصة')}
            </button>
            
            <button type="button" onClick={() => setIsRegister(!isRegister)} className="w-full text-slate-500 text-sm font-medium hover:text-indigo-600 transition-colors">
              {isRegister ? 'لديك حساب بالفعل؟ سجل دخولك' : 'لا تملك حساباً؟ أنشئ حساب طالب جديد'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- واجهة الأدمن ---
  if (view === 'admin' && isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 pb-20" dir="rtl">
        <header className="bg-white border-b p-5 px-10 flex justify-between items-center sticky top-0 z-50 shadow-sm">
           <button onClick={() => setView('dashboard')} className="text-indigo-600 font-bold hover:bg-indigo-50 px-4 py-2 rounded-xl transition-colors">&rarr; معاينة كطالب</button>
           <h1 className="text-xl font-bold text-slate-800 tracking-tight uppercase leading-none">لوحة تحكم المدير</h1>
        </header>

        <main className="p-8 max-w-5xl mx-auto space-y-8">
          <button 
            onClick={() => {
              const id = Date.now().toString();
              saveCourse({ id, title: 'دورة جديدة', description: 'أضف وصفاً هنا', sections: [] });
            }}
            className="w-full bg-white border-2 border-dashed border-slate-300 p-10 rounded-[2.5rem] text-slate-400 font-bold hover:border-indigo-400 hover:text-indigo-500 transition-all flex items-center justify-center gap-3 group shadow-sm"
          >
            <Plus size={28} className="group-hover:scale-110 transition-transform" /> أضف دورة تعليمية جديدة للمنصة
          </button>

          {courses.map(course => (
            <div key={course.id} className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-slate-100 overflow-hidden">
              <div className="flex justify-between items-start mb-8">
                <div className="flex-1 space-y-3">
                  <input className="text-2xl font-bold w-full outline-none border-b-2 border-transparent focus:border-indigo-400 pb-1" value={course.title} onChange={e => saveCourse({...course, title: e.target.value})}/>
                  <input className="text-slate-500 w-full outline-none" value={course.description} onChange={e => saveCourse({...course, description: e.target.value})}/>
                </div>
                <button onClick={() => deleteCourse(course.id)} className="text-red-400 p-3 hover:bg-red-50 rounded-2xl transition-colors"><Trash2 size={24}/></button>
              </div>

              <div className="space-y-6 pt-8 border-t border-slate-50">
                <div className="flex justify-between items-center">
                   <h3 className="font-bold text-slate-800">الأقسام والفيديوهات</h3>
                   <button onClick={() => {
                     const sections = [...(course.sections||[]), {id: Date.now().toString(), title: 'عنوان القسم الجديد', lessons: []}];
                     saveCourse({...course, sections});
                   }} className="text-xs bg-indigo-600 text-white px-5 py-2.5 rounded-2xl font-bold shadow-lg shadow-indigo-100 active:scale-95 transition-all">إضافة قسم جديد +</button>
                </div>

                {course.sections?.map(section => (
                  <div key={section.id} className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                    <input className="font-bold text-slate-800 bg-transparent outline-none w-full mb-5 border-b border-slate-200 pb-1 focus:border-indigo-400 transition-all" value={section.title} onChange={e => {
                      const sections = course.sections.map(s => s.id === section.id ? {...s, title: e.target.value} : s);
                      saveCourse({...course, sections});
                    }}/>
                    
                    <div className="space-y-3">
                      {section.lessons?.map(lesson => (
                        <div key={lesson.id} className="flex gap-3 items-center bg-white p-3 rounded-2xl shadow-sm border border-slate-100">
                          <input className="flex-[2] p-2 text-sm outline-none font-bold text-slate-700" value={lesson.title} placeholder="عنوان الدرس" onChange={e => {
                            const sections = course.sections.map(s => s.id === section.id ? {...s, lessons: s.lessons.map(l => l.id === lesson.id ? {...l, title: e.target.value} : l)} : s);
                            saveCourse({...course, sections});
                          }}/>
                          <input className="flex-[4] p-2 text-sm outline-none font-mono text-indigo-600 bg-slate-50 rounded-xl border border-transparent" value={lesson.videoUrl} placeholder="رابط MP4 المباشر" dir="ltr" onChange={e => {
                            const sections = course.sections.map(s => s.id === section.id ? {...s, lessons: s.lessons.map(l => l.id === lesson.id ? {...l, videoUrl: e.target.value} : l)} : s);
                            saveCourse({...course, sections});
                          }}/>
                          <button onClick={() => {
                            const sections = course.sections.map(s => s.id === section.id ? {...s, lessons: s.lessons.filter(l => l.id !== lesson.id)} : s);
                            saveCourse({...course, sections});
                          }} className="text-red-300 hover:text-red-500 p-2 transition-colors"><Trash2 size={18}/></button>
                        </div>
                      ))}
                      <button onClick={() => {
                        const sections = course.sections.map(s => s.id === section.id ? {...s, lessons: [...(s.lessons||[]), {id: Date.now().toString(), title: 'فيديو جديد', videoUrl: ''}]} : s);
                        saveCourse({...course, sections});
                      }} className="text-xs text-indigo-600 font-bold mt-4 hover:bg-indigo-50 px-4 py-2 rounded-xl transition-all border border-indigo-100 inline-flex items-center gap-2">
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

  // --- واجهة مشاهدة الفيديو ---
  if (view === 'video') {
    return (
      <div className="h-screen flex flex-col bg-[#0f172a]" dir="rtl">
        <header className="p-4 border-b border-slate-800 flex justify-between items-center bg-[#1e293b] shadow-xl z-10">
          <button onClick={() => setView('dashboard')} className="text-indigo-400 font-bold flex items-center gap-1 hover:text-indigo-300 transition-colors">
            &rarr; عودة للرئيسية
          </button>
          <div className="text-right">
            <h1 className="font-bold text-white text-lg line-clamp-1 italic tracking-tight">{activeLesson.title}</h1>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest leading-none">{activeCourse.title}</p>
          </div>
        </header>
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          <div className="flex-1 relative flex items-center justify-center border-l border-slate-800 bg-black">
            <Watermark email={user.email} />
            {activeLesson.videoUrl ? (
              <video src={activeLesson.videoUrl} controls controlsList="nodownload" className="max-h-full w-full object-contain shadow-2xl" onContextMenu={e => e.preventDefault()} />
            ) : (
              <div className="text-center space-y-4 opacity-30">
                 <Video size={80} className="text-white mx-auto animate-pulse" />
                 <p className="text-white font-bold italic">لا يوجد فيديو متاح حالياً</p>
              </div>
            )}
          </div>
          <div className="w-full lg:w-96 border-r border-slate-800 overflow-y-auto p-8 bg-[#1e293b] space-y-8 shadow-2xl">
            <h2 className="font-bold text-white text-xl border-b border-slate-700 pb-4 uppercase italic tracking-tighter">محتوى الدورة</h2>
            {activeCourse.sections?.map(s => (
              <div key={s.id} className="space-y-4">
                <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">{s.title}</h3>
                <div className="space-y-3">
                  {s.lessons?.map(l => (
                    <button 
                      key={l.id} 
                      onClick={() => setActiveLesson(l)} 
                      className={`w-full text-right p-5 rounded-[1.5rem] text-sm transition-all flex items-center gap-4 border-2 ${activeLesson.id === l.id ? 'bg-indigo-600 border-indigo-400 text-white shadow-2xl' : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                    >
                      {progress.includes(l.id) ? <CheckCircle size={20} className="text-emerald-400"/> : <PlayCircle size={20} className="opacity-40"/>}
                      <span className="flex-1 font-bold leading-tight">{l.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
            
            {!isAdmin && (
              <button onClick={() => toggleLesson(activeLesson.id)} className={`w-full mt-10 py-5 rounded-[1.5rem] font-black shadow-2xl transition-all flex items-center justify-center gap-3 border-2 active:scale-95 ${progress.includes(activeLesson.id) ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-indigo-600 text-white border-indigo-400 hover:bg-indigo-50'}`}>
                <CheckCircle size={24}/>
                {progress.includes(activeLesson.id) ? 'تم إكمال هذا الدرس' : 'تحديد كـ مكتمل'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- الواجهة الرئيسية ---
  return (
    <div className="min-h-screen bg-[#f8fafc]" dir="rtl">
      {isAdmin && (
        <div className="bg-[#1e293b] text-white p-4 text-center text-xs font-black flex justify-center gap-5 border-b border-indigo-500/30 shadow-xl relative z-20">
          <span className="opacity-60 uppercase tracking-widest italic leading-none">وضع المدير مفعل</span>
          <button onClick={() => setView('admin')} className="text-indigo-400 hover:underline flex items-center gap-1 font-black leading-none">
            <Settings size={14} className="animate-spin-slow"/> فتح لوحة التحكم والإدارة
          </button>
        </div>
      )}
      
      <header className="bg-white border-b p-6 md:px-12 flex justify-between items-center sticky top-0 z-50 shadow-sm">
        <button onClick={() => auth.signOut()} className="text-red-500 flex items-center gap-2 text-sm font-black bg-red-50 px-5 py-2.5 rounded-2xl hover:bg-red-100 transition-all active:scale-95">
          <LogOut size={20}/> تسجيل الخروج
        </button>
        <div className="flex items-center gap-4">
           <div className="text-right hidden sm:block leading-tight">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic leading-none">مرحباً بك مجدداً</p>
              <p className="text-sm font-black text-slate-800 tracking-tight leading-none">{user.email ? user.email.split('@')[0] : 'Admin'}</p>
           </div>
           <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center border border-indigo-100">
              <ShieldAlert className="text-indigo-600 shadow-sm" size={32}/>
           </div>
        </div>
      </header>

      <main className="p-8 md:p-16 max-w-7xl mx-auto relative">
        <div className="mb-16 text-center sm:text-right relative">
          <h2 className="text-4xl font-black text-slate-900 mb-3 tracking-tight italic">أكاديمية <span className="text-indigo-600 underline decoration-indigo-200 decoration-8 underline-offset-8">صهيب</span></h2>
          <p className="text-slate-400 text-lg font-medium opacity-70 italic tracking-tight">Professional Hub for Advanced Medical Education.</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10">
          {courses.map(course => {
             let total = 0; let done = 0;
             course.sections?.forEach(s => {
               total += (s.lessons?.length || 0);
               s.lessons?.forEach(l => { if(progress.includes(l.id)) done++; });
             });
             const percent = total > 0 ? Math.round((done/total)*100) : 0;

             return (
               <div key={course.id} className="bg-white rounded-[3rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:-translate-y-3 transition-all duration-500 overflow-hidden flex flex-col group relative">
                 <div className="h-48 bg-indigo-600 flex items-center justify-center relative overflow-hidden">
                   <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-all duration-700"></div>
                   <BookOpen size={80} className="text-white/20 group-hover:scale-125 transition-transform duration-1000" />
                   {percent === 100 && (
                     <div className="absolute top-6 right-6 bg-emerald-500 text-white text-[10px] font-black px-4 py-1.5 rounded-full shadow-2xl flex items-center gap-2 border border-white/20 uppercase tracking-widest italic">
                       <CheckCircle size={14}/> Complete
                     </div>
                   )}
                 </div>
                 <div className="p-10 flex-1 flex flex-col">
                   <h3 className="font-black text-2xl mb-3 text-slate-800 group-hover:text-indigo-600 transition-colors leading-tight tracking-tight uppercase line-clamp-1 leading-none">{course.title}</h3>
                   <p className="text-sm text-slate-500 flex-1 leading-relaxed line-clamp-3 font-medium opacity-70 italic tracking-tight">{course.description}</p>
                   
                   <div className="mt-10 mb-8">
                      <div className="flex justify-between text-[11px] font-black text-slate-400 mb-3 uppercase tracking-widest font-mono leading-none">
                        <span className="italic">Progress Status</span>
                        <span className="text-indigo-600 font-black">{percent}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden shadow-inner border border-slate-50">
                        <div className="bg-indigo-600 h-full rounded-full transition-all duration-1000 ease-out shadow-lg" style={{ width: `${percent}%` }}></div>
                      </div>
                   </div>

                   <button 
                     onClick={() => {
                       const first = course.sections?.[0]?.lessons?.[0];
                       if (first) {
                         setActiveCourse(course);
                         setActiveLesson(first);
                         setView('video');
                       } else { alert('قيد التحضير.. لم يقم المدير بإضافة دروس لهذه الدورة بعد.'); }
                     }}
                     className="w-full bg-[#1e293b] hover:bg-indigo-600 text-white py-5 rounded-[2rem] font-black shadow-xl shadow-indigo-100 transition-all active:scale-95 uppercase tracking-widest italic leading-none"
                   >
                     {percent > 0 ? 'Resume Course' : 'Enter Academy'}
                   </button>
                 </div>
               </div>
             );
          })}
          {courses.length === 0 && (
            <div className="col-span-full py-48 text-center bg-white rounded-[5rem] border-4 border-dashed border-slate-100 flex flex-col items-center gap-10 shadow-inner group">
               <div className="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center shadow-sm">
                  <Video size={48} className="text-slate-200 animate-pulse" />
               </div>
               <div className="space-y-2">
                 <p className="text-slate-400 font-black text-2xl tracking-tighter uppercase italic opacity-40 leading-none">Library archive empty</p>
                 <p className="text-slate-300 text-[11px] font-black uppercase tracking-[0.4em] tracking-widest opacity-60 font-mono leading-none">Synchronizing Master Content</p>
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
