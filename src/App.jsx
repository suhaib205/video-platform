import React, { useState, useEffect } from 'react';
import { 
  PlayCircle, BookOpen, Settings, LogOut, ShieldAlert, Lock, 
  Plus, Trash2, Video, ChevronDown, CheckCircle, UserPlus, LogIn, X 
} from 'lucide-react';

// ==========================================
// 1. إعدادات Firebase الخاصة بك (جاهزة للعمل)
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

  // مراقبة حالة المستخدم
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser(u);
        setIsAdmin(u.email === 'admin@admin.com'); // بريد المدير الافتراضي
        setView('dashboard');
      } else {
        setUser(null);
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

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isRegister) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
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
            <p className="text-slate-400 mt-2 text-sm">أدخل بياناتك للمتابعة (أو استخدم admin@admin.com كمدير)</p>
          </div>
          <form onSubmit={handleAuth} className="p-8 space-y-5">
            {error && <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-xs font-bold border border-red-100 text-center leading-relaxed">{error}</div>}
            
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 mr-2">البريد الإلكتروني</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-4 bg-slate-50 border rounded-2xl outline-none focus:ring-2 ring-indigo-500 text-left" dir="ltr" required />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 mr-2">كلمة المرور</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-4 bg-slate-50 border rounded-2xl outline-none focus:ring-2 ring-indigo-500 text-left" dir="ltr" required />
            </div>

            <button disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-bold shadow-lg shadow-indigo-100 transition-all flex justify-center items-center gap-2">
              <LogIn size={20} />
              {loading ? 'جاري التحقق...' : (isRegister ? 'إنشاء حساب طالب' : 'تسجيل الدخول')}
            </button>
            
            <button type="button" onClick={() => setIsRegister(!isRegister)} className="w-full text-slate-500 text-sm font-medium hover:text-indigo-600 transition-colors">
              {isRegister ? 'لديك حساب بالفعل؟ سجل دخولك' : 'لا تملك حساباً؟ أنشئ حساباً كطالب'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- واجهة الأدمن ---
  if (view === 'admin') {
    return (
      <div className="min-h-screen bg-slate-50 pb-20" dir="rtl">
        <header className="bg-white border-b p-4 px-8 flex justify-between items-center sticky top-0 z-50">
           <button onClick={() => setView('dashboard')} className="text-indigo-600 font-bold hover:underline">معاينة الطالب &larr;</button>
           <h1 className="text-xl font-bold text-slate-800">لوحة تحكم المدير</h1>
        </header>

        <main className="p-6 max-w-4xl mx-auto space-y-6">
          <button 
            onClick={() => {
              const id = Date.now().toString();
              saveCourse({ id, title: 'دورة جديدة', description: 'وصف الدورة', sections: [] });
            }}
            className="w-full bg-white border-2 border-dashed border-slate-300 p-8 rounded-[2rem] text-slate-400 font-bold hover:border-indigo-400 hover:text-indigo-500 transition-all flex items-center justify-center gap-3"
          >
            <Plus size={24}/> إنشاء دورة تعليمية جديدة
          </button>

          {courses.map(course => (
            <div key={course.id} className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 overflow-hidden relative">
              <div className="flex justify-between items-start mb-6">
                <div className="flex-1 space-y-2">
                  <input className="text-xl font-bold w-full outline-none border-b-2 border-transparent focus:border-indigo-400" value={course.title} onChange={e => saveCourse({...course, title: e.target.value})}/>
                  <input className="text-sm text-slate-500 w-full outline-none" value={course.description} onChange={e => saveCourse({...course, description: e.target.value})}/>
                </div>
                <button onClick={() => deleteCourse(course.id)} className="text-red-400 p-2 hover:bg-red-50 rounded-xl transition-colors"><Trash2 size={20}/></button>
              </div>

              <div className="space-y-4 pt-6 border-t border-slate-50">
                <div className="flex justify-between items-center mb-4">
                   <h3 className="font-bold text-slate-700 text-sm">أقسام المحتوى</h3>
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
                          <input className="flex-[3] p-2 text-sm outline-none font-mono text-indigo-600 bg-slate-50 rounded-lg" value={lesson.videoUrl} placeholder="رابط MP4 المباشر" dir="ltr" onChange={e => {
                            const sections = course.sections.map(s => s.id === section.id ? {...s, lessons: s.lessons.map(l => l.id === lesson.id ? {...l, videoUrl: e.target.value} : l)} : s);
                            saveCourse({...course, sections});
                          }}/>
                          <button onClick={() => {
                            const sections = course.sections.map(s => s.id === section.id ? {...s, lessons: s.lessons.filter(l => l.id !== lesson.id)} : s);
                            saveCourse({...course, sections});
                          }} className="text-red-300 hover:text-red-500 p-1"><Trash2 size={16}/></button>
                        </div>
                      ))}
                      <button onClick={() => {
                        const sections = course.sections.map(s => s.id === section.id ? {...s, lessons: [...(s.lessons||[]), {id: Date.now().toString(), title: 'درس جديد', videoUrl: ''}]} : s);
                        saveCourse({...course, sections});
                      }} className="text-xs text-indigo-500 font-bold mt-2 hover:bg-indigo-100 px-3 py-1 rounded-lg transition-colors flex items-center gap-1">
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
  if (view === 'video') {
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
          <div className="flex-1 relative flex items-center justify-center border-l border-slate-800">
            <Watermark email={user.email} />
            {activeLesson.videoUrl ? (
              <video src={activeLesson.videoUrl} controls controlsList="nodownload" className="max-h-full w-full object-contain" onContextMenu={e => e.preventDefault()} />
            ) : (
              <div className="text-center space-y-4">
                 <Video size={60} className="text-slate-700 mx-auto" />
                 <p className="text-slate-500 italic">رابط الفيديو غير متوفر حالياً</p>
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

  // --- الواجهة الرئيسية ---
  return (
    <div className="min-h-screen bg-[#f8fafc]" dir="rtl">
      {isAdmin && (
        <div className="bg-[#1e293b] text-white p-3 text-center text-xs font-bold flex justify-center gap-4 border-b border-indigo-500/30">
          وضع المدير مفعل
          <button onClick={() => setView('admin')} className="text-indigo-400 hover:underline">فتح لوحة التحكم</button>
        </div>
      )}
      
      <header className="bg-white border-b p-5 md:px-10 flex justify-between items-center sticky top-0 z-50 shadow-sm">
        <button onClick={() => auth.signOut()} className="text-red-500 flex items-center gap-2 text-sm font-bold bg-red-50 px-4 py-2 rounded-xl hover:bg-red-100 transition-colors">
          <LogOut size={18}/> خروج
        </button>
        <div className="flex items-center gap-3">
           <div className="text-right hidden md:block">
              <p className="text-xs font-bold text-slate-400">مرحباً بك</p>
              <p className="text-sm font-black text-slate-800">{user.email.split('@')[0]}</p>
           </div>
           <ShieldAlert className="text-indigo-600" size={32}/>
        </div>
      </header>

      <main className="p-6 md:p-12 max-w-7xl mx-auto">
        <div className="mb-12">
          <h2 className="text-3xl font-black text-slate-900 mb-2">دوراتك التعليمية</h2>
          <p className="text-slate-500 font-medium">استكمل رحلة التعلم الخاصة بك بأمان وخصوصية تامة.</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {courses.map(course => {
             // حساب التقدم
             let total = 0;
             let done = 0;
             course.sections?.forEach(s => {
               total += (s.lessons?.length || 0);
               s.lessons?.forEach(l => { if(progress.includes(l.id)) done++; });
             });
             const percent = total > 0 ? Math.round((done/total)*100) : 0;

             return (
               <div key={course.id} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 overflow-hidden flex flex-col group">
                 <div className="h-44 bg-indigo-600 flex items-center justify-center relative">
                   <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors"></div>
                   <BookOpen size={70} className="text-white/20 group-hover:scale-110 transition-transform duration-700" />
                   {percent === 100 && (
                     <div className="absolute top-4 right-4 bg-emerald-500 text-white text-[10px] font-black px-3 py-1 rounded-full shadow-lg">مكتملة ✅</div>
                   )}
                 </div>
                 <div className="p-8 flex-1 flex flex-col">
                   <h3 className="font-black text-xl mb-3 text-slate-800 group-hover:text-indigo-600 transition-colors">{course.title}</h3>
                   <p className="text-sm text-slate-500 flex-1 leading-relaxed line-clamp-3">{course.description}</p>
                   
                   <div className="mt-8 mb-6">
                      <div className="flex justify-between text-[10px] font-black text-slate-400 mb-2 uppercase">
                        <span>نسبة الإنجاز</span>
                        <span className="text-indigo-600">{percent}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div className="bg-indigo-600 h-full rounded-full transition-all duration-1000" style={{ width: `${percent}%` }}></div>
                      </div>
                   </div>

                   <button 
                     onClick={() => {
                       const first = course.sections?.[0]?.lessons?.[0];
                       if (first) {
                         setActiveCourse(course);
                         setActiveLesson(first);
                         setView('video');
                       } else { alert('لا توجد دروس متاحة في هذه الدورة بعد.'); }
                     }}
                     className="w-full bg-[#1e293b] text-white py-4 rounded-[1.5rem] font-bold shadow-xl shadow-slate-200 hover:bg-indigo-600 transition-all active:scale-95"
                   >
                     {percent > 0 ? 'متابعة التعلم' : 'ابدأ المشاهدة الآن'}
                   </button>
                 </div>
               </div>
             );
          })}
          {courses.length === 0 && (
            <div className="col-span-full py-24 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
               <Video size={80} className="text-slate-200 mx-auto mb-4" />
               <p className="text-slate-400 font-bold">لم يتم إضافة أي دورات تعليمية حتى الآن.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
