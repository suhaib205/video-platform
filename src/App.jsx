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
    <div className="absolute inset-0 pointer-events-none z-50 select-none overflow-hidden opacity-30">
      <div 
        className="absolute transition-all duration-[4000ms] ease-in-out text-white font-mono text-[10px] md:text-sm bg-black/30 px-2 py-1 rounded-full whitespace-nowrap"
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
  
  const [view, setView] = useState('login'); // login, dashboard, video, admin
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
        // التعديل: تعيين بريد صهيب كآدمن
        setIsAdmin(u.email === 'lexer626@gmail.com'); 
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

  // وظيفة لتحويل روابط يوتيوب العادية لروابط Embed لتعمل في الموقع
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
    try {
      if (isRegister) {
        await createUserWithEmailAndPassword(auth, email.toLowerCase().trim(), password);
      } else {
        await signInWithEmailAndPassword(auth, email.toLowerCase().trim(), password);
      }
    } catch (err) {
      if (err.code === 'auth/configuration-not-found') {
        setError('خطأ: يرجى تفعيل Email/Password في إعدادات Firebase Authentication');
      } else {
        setError('خطأ في الدخول: تأكد من الإيميل وكلمة المرور (6 خانات)');
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

  // --- واجهة تسجيل الدخول ---
  if (view === 'login') {
    return (
      <div className="min-h-screen bg-[#f1f5f9] flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden">
          <div className="bg-[#1e293b] p-10 text-center text-white">
            <ShieldAlert size={60} className="text-indigo-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold">المنصة التعليمية الآمنة</h1>
            <p className="text-slate-400 mt-2 text-sm">أدخل بياناتك للمتابعة للوصول إلى دروسك</p>
          </div>
          <form onSubmit={handleAuth} className="p-8 space-y-5">
            {error && <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-xs font-bold border border-red-100 text-center leading-relaxed">{error}</div>}
            
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 mr-2">البريد الإلكتروني</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-4 bg-slate-50 border rounded-2xl outline-none focus:ring-2 ring-indigo-500 text-left" dir="ltr" placeholder="example@mail.com" required />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 mr-2">كلمة المرور</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-4 bg-slate-50 border rounded-2xl outline-none focus:ring-2 ring-indigo-500 text-left" dir="ltr" placeholder="••••••••" required />
            </div>

            <button disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-bold shadow-lg shadow-indigo-100 transition-all flex justify-center items-center gap-2">
              <LogIn size={20} />
              {loading ? 'جاري التحقق...' : (isRegister ? 'إنشاء حساب جديد' : 'تسجيل الدخول')}
            </button>
            
            <button type="button" onClick={() => { setIsRegister(!isRegister); setError(''); }} className="w-full text-slate-500 text-sm font-medium hover:text-indigo-600 transition-colors">
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
        <header className="bg-white border-b p-4 px-8 flex justify-between items-center sticky top-0 z-50 shadow-sm">
           <button onClick={() => setView('dashboard')} className="text-indigo-600 font-bold hover:underline">معاينة الطالب &larr;</button>
           <h1 className="text-xl font-bold text-slate-800">لوحة تحكم المدير</h1>
        </header>

        <main className="p-6 max-w-4xl mx-auto space-y-6">
          <button 
            onClick={() => {
              const id = Date.now().toString();
              saveCourse({ id, title: 'دورة جديدة', description: 'وصف الدورة', sections: [] });
            }}
            className="w-full bg-white border-2 border-dashed border-slate-300 p-8 rounded-[2rem] text-slate-400 font-bold hover:border-indigo-400 hover:text-indigo-500 transition-all flex items-center justify-center gap-3 shadow-sm"
          >
            <Plus size={24}/> إضافة دورة تعليمية جديدة
          </button>

          {courses.map(course => (
            <div key={course.id} className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 overflow-hidden relative">
              <div className="flex justify-between items-start mb-6">
                <div className="flex-1 space-y-2">
                  <input className="text-xl font-bold w-full outline-none border-b-2 border-transparent focus:border-indigo-400" value={course.title} onChange={e => saveCourse({...course, title: e.target.value})}/>
                  <input className="text-sm text-slate-500 w-full outline-none px-1" value={course.description} onChange={e => saveCourse({...course, description: e.target.value})}/>
                </div>
                <button onClick={() => deleteCourse(course.id)} className="text-red-400 p-2 hover:bg-red-50 rounded-xl transition-colors"><Trash2 size={20}/></button>
              </div>

              <div className="space-y-4 pt-6 border-t border-slate-50">
                <div className="flex justify-between items-center mb-4">
                   <h3 className="font-bold text-slate-700 text-sm">أقسام ومقاطع الدورة</h3>
                   <button onClick={() => {
                     const sections = [...(course.sections||[]), {id: Date.now().toString(), title: 'قسم جديد', lessons: []}];
                     saveCourse({...course, sections});
                   }} className="text-xs bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl font-bold">إضافة قسم +</button>
                </div>

                {course.sections?.map(section => (
                  <div key={section.id} className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                    <input className="font-bold text-slate-800 bg-transparent outline-none w-full mb-4 border-b border-slate-200" value={section.title} onChange={e => {
                      const sections = course.sections.map(s => s.id === section.id ? {...s, title: e.target.value} : s);
                      saveCourse({...course, sections});
                    }}/>
                    
                    <div className="space-y-3">
                      {section.lessons?.map(lesson => (
                        <div key={lesson.id} className="flex gap-2 items-center bg-white p-2 rounded-xl shadow-sm border border-slate-100">
                          <input className="flex-[2] p-2 text-sm outline-none font-medium" value={lesson.title} placeholder="عنوان الفيديو" onChange={e => {
                            const sections = course.sections.map(s => s.id === section.id ? {...s, lessons: s.lessons.map(l => l.id === lesson.id ? {...l, title: e.target.value} : l)} : s);
                            saveCourse({...course, sections});
                          }}/>
                          <input className="flex-[4] p-2 text-sm outline-none font-mono text-indigo-600 bg-slate-50 rounded-lg" value={lesson.videoUrl} placeholder="رابط يوتيوب أو فيديو مباشر" dir="ltr" onChange={e => {
                            const sections = course.sections.map(s => s.id === section.id ? {...s, lessons: s.lessons.map(l => l.id === lesson.id ? {...l, videoUrl: e.target.value} : l)} : s);
                            saveCourse({...course, sections});
                          }}/>
                          <button onClick={() => {
                            const sections = course.sections.map(s => s.id === section.id ? {...s, lessons: s.lessons.filter(l => l.id !== lesson.id)} : s);
                            saveCourse({...course, sections});
                          }} className="text-red-300 hover:text-red-500 p-1 transition-colors"><Trash2 size={16}/></button>
                        </div>
                      ))}
                      <button onClick={() => {
                        const sections = course.sections.map(s => s.id === section.id ? {...s, lessons: [...(s.lessons||[]), {id: Date.now().toString(), title: 'فيديو جديد', videoUrl: ''}]} : s);
                        saveCourse({...course, sections});
                      }} className="text-xs text-indigo-500 font-bold mt-2 hover:bg-indigo-100 px-3 py-1 rounded-lg transition-colors flex items-center gap-1 border border-indigo-100">
                        <Plus size={14}/> إضافة فيديو للقسم
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
  if (view === 'video' && activeCourse && activeLesson) {
    const youtubeUrl = getYoutubeEmbedUrl(activeLesson.videoUrl);

    return (
      <div className="h-screen flex flex-col bg-white" dir="rtl">
        <header className="p-4 border-b flex justify-between items-center bg-white shadow-sm z-10">
          <button onClick={() => setView('dashboard')} className="text-indigo-600 font-bold flex items-center gap-1">
            &rarr; العودة للرئيسية
          </button>
          <div className="text-right">
            <h1 className="font-bold text-slate-800 line-clamp-1">{activeLesson.title}</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase">{activeCourse.title}</p>
          </div>
        </header>
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-slate-900">
          <div className="flex-1 relative flex items-center justify-center border-l border-slate-800 bg-black">
            <Watermark email={user.email} />
            
            {youtubeUrl ? (
              <iframe 
                src={youtubeUrl} 
                className="w-full h-full" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowFullScreen
              ></iframe>
            ) : activeLesson.videoUrl ? (
              <video src={activeLesson.videoUrl} controls controlsList="nodownload" className="max-h-full w-full object-contain shadow-2xl" onContextMenu={e => e.preventDefault()} />
            ) : (
              <div className="text-center space-y-4 opacity-30">
                 <Video size={80} className="text-white mx-auto animate-pulse" />
                 <p className="text-white font-bold italic">رابط الفيديو غير متوفر حالياً</p>
              </div>
            )}
          </div>
          <div className="w-full lg:w-80 border-r border-slate-800 overflow-y-auto p-6 bg-[#0f172a] space-y-6">
            <h2 className="font-bold text-white text-lg border-b border-slate-700 pb-3">قائمة الدروس</h2>
            {activeCourse.sections?.map(s => (
              <div key={s.id} className="space-y-3">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{s.title}</h3>
                <div className="space-y-2">
                  {s.lessons?.map(l => (
                    <button 
                      key={l.id} 
                      onClick={() => setActiveLesson(l)} 
                      className={`w-full text-right p-4 rounded-2xl text-sm transition-all flex items-center gap-3 border ${activeLesson.id === l.id ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg' : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-800'}`}
                    >
                      {progress.includes(l.id) ? <CheckCircle size={16} className="text-emerald-400"/> : <PlayCircle size={16} className="opacity-50"/>}
                      <span className="flex-1 truncate">{l.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
            
            {!isAdmin && (
              <button onClick={() => toggleLesson(activeLesson.id)} className={`w-full mt-10 py-4 rounded-2xl font-bold shadow-xl transition-all flex items-center justify-center gap-2 ${progress.includes(activeLesson.id) ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50' : 'bg-indigo-600 text-white hover:bg-indigo-500'}`}>
                <CheckCircle size={20}/>
                {progress.includes(activeLesson.id) ? 'تم إكمال المشاهدة' : 'تحديد كـ مكتمل'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- الواجهة الرئيسية للطلاب ---
  return (
    <div className="min-h-screen bg-[#f8fafc]" dir="rtl">
      {isAdmin && (
        <div className="bg-[#1e293b] text-white p-3 text-center text-xs font-bold flex justify-center gap-5 border-b border-indigo-500/30 shadow-xl relative z-20">
          <span className="opacity-60 uppercase tracking-widest italic leading-none">وضع المدير مفعل</span>
          <button onClick={() => setView('admin')} className="text-indigo-400 hover:underline flex items-center gap-1 font-black leading-none">
            <Settings size={14}/> فتح لوحة التحكم والإدارة
          </button>
        </div>
      )}
      
      <header className="bg-white border-b p-6 md:px-12 flex justify-between items-center sticky top-0 z-50 shadow-sm">
        <button onClick={() => auth.signOut()} className="text-red-500 flex items-center gap-2 text-sm font-bold bg-red-50 px-5 py-2.5 rounded-2xl hover:bg-red-100 transition-all active:scale-95 shadow-sm">
          <LogOut size={20}/> خروج
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
          <h2 className="text-4xl font-black text-slate-900 mb-3 tracking-tight italic uppercase">أكاديمية <span className="text-indigo-600 underline decoration-indigo-200 decoration-8 underline-offset-8">صهيب</span></h2>
          <p className="text-slate-400 text-lg font-medium italic tracking-tight opacity-70">Professional Hub for Advanced Professional Education.</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10">
          {courses.map(course => {
             // حساب التقدم
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
                       } else { alert('Coming Soon! هذا المحتوى التعليمي قيد المزامنة حالياً من قبل الإدارة.'); }
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
            <div className="col-span-full py-48 text-center bg-white rounded-[5rem] border-4 border-dashed border-slate-100 flex flex-col items-center gap-10 shadow-inner group transition-all hover:bg-slate-50">
               <div className="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center shadow-sm group-hover:bg-indigo-50 transition-colors">
                  <Video size={48} className="text-slate-200 animate-pulse" />
               </div>
               <div className="space-y-3">
                 <p className="text-slate-400 font-black text-2xl tracking-tighter uppercase italic opacity-40 leading-none">Library archive empty</p>
                 <p className="text-slate-300 text-[11px] font-black uppercase tracking-[0.4em] tracking-widest opacity-60 font-mono leading-none">Synchronizing Master Content</p>
               </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
