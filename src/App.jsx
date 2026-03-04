import React, { useState, useEffect, useRef } from 'react';
import { 
  PlayCircle, BookOpen, Settings, LogOut, ShieldAlert, Lock, 
  Plus, Trash2, Video, ChevronDown, CheckCircle, UserPlus, LogIn, X, Activity, ShieldCheck, Play,
  Eye, EyeOff, Search, Filter, Globe, ArrowUp, ArrowDown, FileText, ArrowRight, ArrowLeft, Upload, Image as ImageIcon
} from 'lucide-react';

// ==========================================
// 1. Firebase Config
// ==========================================
import { initializeApp } from 'firebase/app';
import { 
  getAuth, onAuthStateChanged, createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, signOut, setPersistence, browserLocalPersistence, browserSessionPersistence
} from 'firebase/auth';
import { 
  getFirestore, collection, onSnapshot, doc, setDoc, deleteDoc, 
  arrayUnion, arrayRemove 
} from 'firebase/firestore';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage'; // إضافة مكتبة التخزين للصور

const firebaseConfig = {
  apiKey: "AIzaSyCGah4UwLysOMhBQNR6ov9UJMjEUuorVOM",
  authDomain: "video-platform-d99d3.firebaseapp.com",
  projectId: "video-platform-d99d3",
  storageBucket: "video-platform-d99d3.firebasestorage.app",
  messagingSenderId: "31338710927",
  appId: "1:31338710927:web:fa903a6d1804f0b7e4adfa"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app); // تهيئة مساحة تخزين الصور

const APP_ID = 'video-platform-prod';

// ==========================================
// 🔴 مفاتيح التحكم بالمنصة (Feature Flags) 🔴
// ==========================================
// قم بتغيير false إلى true إذا أردت إظهار التصنيفات مستقبلاً
const ENABLE_CATEGORIES = false; 

// ==========================================
// 2. i18n Translations Dictionary
// ==========================================
const translations = {
  ar: {
    loginTitle: "المنصة التعليمية الآمنة",
    loginDesc: "أدخل بياناتك للمتابعة للوصول إلى دروسك",
    email: "البريد الإلكتروني",
    password: "كلمة المرور",
    rememberMe: "تذكرني",
    loginBtn: "تسجيل الدخول",
    registerBtn: "إنشاء حساب جديد",
    noAccount: "لا تملك حساباً؟ أنشئ حساب طالب جديد",
    hasAccount: "لديك حساب بالفعل؟ سجل دخولك",
    welcome: "مرحباً بك",
    searchPlaceholder: "ابحث عن دورة...",
    allCategories: "جميع التخصصات",
    medical: "طبي",
    engineering: "هندسي",
    business: "أعمال",
    myCourses: "دوراتي التعليمية",
    continueWatching: "أكمل من حيث توقفت",
    startCourse: "ابدأ التعلم",
    courseDetails: "تفاصيل الدورة",
    curriculum: "المحتوى الدراسي",
    notes: "ملاحظاتي",
    nextLesson: "الدرس التالي",
    prevLesson: "الدرس السابق",
    markComplete: "تحديد كمكتمل",
    completed: "مكتمل",
    logout: "تسجيل خروج",
    adminPanel: "لوحة التحكم",
    adminOnly: "وضع المدير مفعل - تتصفح كآدمن",
    statusPublished: "منشور",
    statusDraft: "مسودة",
    save: "حفظ التعديلات",
    addCourse: "إضافة دورة جديدة"
  },
  en: {
    loginTitle: "Secure Learning Platform",
    loginDesc: "Enter your credentials to access your courses",
    email: "Email Address",
    password: "Password",
    rememberMe: "Remember Me",
    loginBtn: "Login",
    registerBtn: "Create Account",
    noAccount: "Don't have an account? Register here",
    hasAccount: "Already have an account? Login",
    welcome: "Welcome back",
    searchPlaceholder: "Search courses...",
    allCategories: "All Categories",
    medical: "Medical",
    engineering: "Engineering",
    business: "Business",
    myCourses: "My Courses",
    continueWatching: "Resume",
    startCourse: "Start Learning",
    courseDetails: "Course Details",
    curriculum: "Curriculum",
    notes: "My Notes",
    nextLesson: "Next Lesson",
    prevLesson: "Previous",
    markComplete: "Mark Complete",
    completed: "Completed",
    logout: "Logout",
    adminPanel: "Admin Panel",
    adminOnly: "Admin Mode Active",
    statusPublished: "Published",
    statusDraft: "Draft",
    save: "Save Changes",
    addCourse: "Add New Course"
  }
};

// ==========================================
// 3. Helper Components
// ==========================================
const Watermark = ({ email }) => {
  const [pos, setPos] = useState({ top: '20%', left: '20%' });
  useEffect(() => {
    const i = setInterval(() => {
      setPos({ top: Math.floor(Math.random() * 80 + 5) + '%', left: Math.floor(Math.random() * 80 + 5) + '%' });
    }, 12000);
    return () => clearInterval(i);
  }, []);
  return (
    <div className="absolute inset-0 pointer-events-none z-50 select-none overflow-hidden opacity-[0.15]">
      <div className="absolute transition-all duration-[8000ms] ease-in-out text-white font-mono text-xs bg-black/50 px-3 py-1.5 rounded-full backdrop-blur-md" style={pos}>
        {email} | {new Date().toLocaleDateString('en-GB')}
      </div>
    </div>
  );
};

// ==========================================
// 4. Main Application
// ==========================================
export default function App() {
  // Global State
  const [lang, setLang] = useState('ar');
  const t = translations[lang];
  const isRTL = lang === 'ar';

  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [courses, setCourses] = useState([]);
  const [progress, setProgress] = useState([]); 
  
  const [view, setView] = useState('login'); 
  const [activeCourse, setActiveCourse] = useState(null);
  const [activeLesson, setActiveLesson] = useState(null);

  // Auth State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Dashboard State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');

  // Upload State
  const [uploadingImageId, setUploadingImageId] = useState(null);

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

  useEffect(() => {
    if (!user) return;
    const coursesRef = collection(db, 'artifacts', APP_ID, 'public', 'data', 'courses');
    const unsub = onSnapshot(coursesRef, (snap) => {
      setCourses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      console.error("Firestore Error (Courses):", err);
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!user || isAdmin) return;
    const progRef = doc(db, 'artifacts', APP_ID, 'users', user.uid, 'settings', 'progress');
    const unsub = onSnapshot(progRef, (d) => {
      if (d.exists()) setProgress(d.data().completed || []);
    }, (err) => {
      console.error("Firestore Error (Progress):", err);
    });
    return () => unsub();
  }, [user, isAdmin]);

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const cleanEmail = email.toLowerCase().trim();

    try {
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);

      if (isRegister) {
        await createUserWithEmailAndPassword(auth, cleanEmail, password);
      } else {
        await signInWithEmailAndPassword(auth, cleanEmail, password);
      }
    } catch (err) {
      setError(isRTL ? 'بيانات الدخول غير صحيحة أو الحساب غير موجود.' : 'Invalid credentials or account not found.');
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
    if (window.confirm(isRTL ? 'هل أنت متأكد من الحذف؟' : 'Are you sure you want to delete?')) {
      await deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'courses', id));
    }
  };

  // وظيفة رفع الصورة إلى Firebase Storage
  const handleImageUpload = async (e, course) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingImageId(course.id);
    try {
      const fileRef = ref(storage, `thumbnails/${Date.now()}_${file.name}`);
      const uploadTask = await uploadBytesResumable(fileRef, file);
      const downloadURL = await getDownloadURL(fileRef);
      
      // حفظ الرابط الجديد في الدورة
      saveCourse({ ...course, thumbnailUrl: downloadURL });
    } catch (error) {
      console.error("Upload error:", error);
      alert("حدث خطأ أثناء رفع الصورة. يرجى التأكد من إعدادات قواعد Storage (Storage Rules) في Firebase.");
    } finally {
      setUploadingImageId(null);
    }
  };

  const getYoutubeEmbedUrl = (url) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}?rel=0&modestbranding=1` : null;
  };

  const getCourseProgress = (course) => {
    let total = 0; let done = 0;
    course.sections?.forEach(s => {
      total += (s.lessons?.length || 0);
      s.lessons?.forEach(l => { if(progress.includes(l.id)) done++; });
    });
    return total > 0 ? Math.round((done/total)*100) : 0;
  };

  const moveItem = (array, index, direction) => {
    const newArray = [...array];
    if (direction === 'up' && index > 0) {
      [newArray[index - 1], newArray[index]] = [newArray[index], newArray[index - 1]];
    } else if (direction === 'down' && index < newArray.length - 1) {
      [newArray[index + 1], newArray[index]] = [newArray[index], newArray[index + 1]];
    }
    return newArray;
  };

  const globalFontStyles = `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Tajawal:wght@300;400;500;700;800;900&display=swap');
    * { font-family: ${isRTL ? "'Tajawal', 'Outfit'" : "'Outfit', 'Tajawal'"}, sans-serif; }
    .glass-card { background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(16px); border: 1px solid rgba(255,255,255,0.4); box-shadow: 0 10px 40px -10px rgba(0,0,0,0.08); }
    .dark-glass { background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(16px); border: 1px solid rgba(255,255,255,0.05); }
    .hide-scroll::-webkit-scrollbar { display: none; }
  `;

  // --- VIEW: LOGIN ---
  if (view === 'login') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4 relative overflow-hidden" dir={isRTL ? "rtl" : "ltr"}>
        <style>{globalFontStyles}</style>
        <button onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')} className="absolute top-6 right-6 md:right-10 bg-white/50 backdrop-blur-md px-4 py-2 rounded-full shadow-sm border border-white flex items-center gap-2 text-slate-600 hover:text-indigo-600 transition-all font-bold text-sm z-50">
          <Globe size={16} /> {lang === 'ar' ? 'English' : 'العربية'}
        </button>

        <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="glass-card w-full max-w-[440px] rounded-[2.5rem] overflow-hidden relative z-10 transition-all duration-500">
          <div className="p-10 pb-6 text-center relative bg-white/50">
            <div className="w-20 h-20 bg-gradient-to-tr from-indigo-600 to-blue-600 rounded-[1.5rem] mx-auto mb-6 flex items-center justify-center shadow-[0_10px_30px_rgba(79,70,229,0.3)]">
              <ShieldCheck size={36} className="text-white" />
            </div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">Pass your <span className="text-indigo-600 underline decoration-indigo-200 decoration-4 underline-offset-4">license</span></h1>
            <p className="text-slate-500 mt-2 text-sm font-medium">{t.loginDesc}</p>
          </div>
          
          <form onSubmit={handleAuth} className="p-8 pt-4 space-y-5 bg-white/30">
            {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl text-xs font-bold border border-red-100 text-center">{error}</div>}
            
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 px-1">{t.email}</label>
              <div className="relative">
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 text-left font-medium transition-all" dir="ltr" placeholder="student@example.com" required />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 px-1">{t.password}</label>
              <div className="relative">
                <input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 text-left font-medium transition-all" dir="ltr" placeholder="••••••••" required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600">
                  {showPassword ? <EyeOff size={20}/> : <Eye size={20}/>}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 px-1 pb-2">
              <input type="checkbox" id="remember" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"/>
              <label htmlFor="remember" className="text-sm font-medium text-slate-600 cursor-pointer">{t.rememberMe}</label>
            </div>

            <button disabled={loading} className="w-full bg-slate-900 hover:bg-indigo-600 text-white py-4 rounded-2xl font-bold shadow-lg transition-all flex justify-center items-center gap-2 active:scale-[0.98]">
              {loading ? <Activity size={20} className="animate-spin" /> : <LogIn size={20} />}
              {loading ? '...' : (isRegister ? t.registerBtn : t.loginBtn)}
            </button>
            
            <div className="pt-3 text-center">
              <button type="button" onClick={() => { setIsRegister(!isRegister); setError(''); }} className="text-slate-500 text-sm font-medium hover:text-indigo-600 transition-colors">
                {isRegister ? t.hasAccount : t.noAccount}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // --- VIEW: DASHBOARD (Student) ---
  if (view === 'dashboard') {
    const filteredCourses = courses.filter(c => 
      (!ENABLE_CATEGORIES || filterCategory === 'all' || c.category === filterCategory) &&
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
      (isAdmin ? true : c.status !== 'draft') 
    );

    return (
      <div className="min-h-screen bg-[#f8fafc] font-sans" dir={isRTL ? "rtl" : "ltr"}>
        <style>{globalFontStyles}</style>
        
        <header className="glass-card sticky top-0 z-40 px-6 md:px-12 py-4 flex justify-between items-center rounded-b-3xl mx-2 md:mx-4 mt-2">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-gradient-to-tr from-indigo-600 to-blue-500 rounded-xl flex items-center justify-center text-white shadow-md">
                <ShieldCheck size={20}/>
             </div>
             <div className="hidden md:block">
                <h1 className="font-black text-slate-800 text-lg leading-tight">Pass your <span className="text-indigo-600">license</span></h1>
             </div>
          </div>

          <div className="flex items-center gap-4">
            {isAdmin && (
              <button onClick={() => setView('admin')} className="hidden md:flex text-xs font-bold bg-indigo-50 text-indigo-600 px-4 py-2 rounded-lg hover:bg-indigo-100 transition-colors items-center gap-2">
                <Settings size={14}/> {t.adminPanel}
              </button>
            )}
            <div className="text-right hidden sm:block">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">{t.welcome}</p>
              <p className="text-sm font-black text-slate-700 leading-none truncate max-w-[120px]">{user.email?.split('@')[0]}</p>
            </div>
            <button onClick={() => auth.signOut()} className="bg-red-50 text-red-500 p-2.5 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm">
              <LogOut size={18}/>
            </button>
          </div>
        </header>

        <main className="p-6 md:p-12 max-w-[1400px] mx-auto relative space-y-10">
          <div className="flex flex-col md:flex-row justify-between items-end gap-6 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
            <div>
              <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-2">{t.myCourses}</h2>
              <p className="text-slate-500 font-medium">اختر مسارك التعليمي وابدأ رحلة النجاح.</p>
            </div>
            
            <div className="flex w-full md:w-auto gap-3">
              <div className="relative flex-1 md:w-64">
                <Search size={18} className="absolute top-1/2 -translate-y-1/2 right-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder={t.searchPlaceholder} 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 pr-12 pl-4 focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium transition-all"
                />
              </div>
              {ENABLE_CATEGORIES && (
                <select 
                  value={filterCategory} 
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 outline-none text-sm font-bold text-slate-600 focus:ring-2 focus:ring-indigo-500 cursor-pointer appearance-none"
                >
                  <option value="all">{t.allCategories}</option>
                  <option value="medical">{t.medical}</option>
                  <option value="engineering">{t.engineering}</option>
                  <option value="business">{t.business}</option>
                </select>
              )}
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredCourses.map(course => {
               const percent = getCourseProgress(course);
               const lessonCount = course.sections?.reduce((acc, s) => acc + (s.lessons?.length || 0), 0) || 0;

               return (
                 <div key={course.id} className="bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] transition-all duration-300 overflow-hidden flex flex-col group cursor-pointer" onClick={() => { setActiveCourse(course); setView('courseDetails'); }}>
                   <div className="h-48 bg-slate-100 relative overflow-hidden">
                     {course.thumbnailUrl ? (
                       <img src={course.thumbnailUrl} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                     ) : (
                       <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center">
                         <BookOpen size={60} className="text-white/30 group-hover:scale-110 transition-transform duration-500" />
                       </div>
                     )}
                     <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent opacity-80"></div>
                     
                     <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center text-white">
                       <span className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-lg text-xs font-bold border border-white/20">{lessonCount} دروس</span>
                       {percent === 100 && <span className="text-emerald-400 font-bold text-xs flex items-center gap-1"><CheckCircle size={14}/> {t.completed}</span>}
                     </div>
                   </div>
                   
                   <div className="p-6 flex-1 flex flex-col">
                     <h3 className="font-black text-xl mb-2 text-slate-800 group-hover:text-indigo-600 transition-colors line-clamp-1">{course.title}</h3>
                     <p className="text-sm text-slate-500 mb-6 line-clamp-2 leading-relaxed">{course.description}</p>
                     
                     <div className="mt-auto">
                        <div className="flex justify-between text-xs font-bold text-slate-400 mb-2">
                          <span>التقدم</span>
                          <span className="text-indigo-600">{percent}%</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div className="bg-indigo-600 h-full rounded-full transition-all duration-1000" style={{ width: `${percent}%` }}></div>
                        </div>
                     </div>
                   </div>
                 </div>
               );
            })}
          </div>
          
          {filteredCourses.length === 0 && (
            <div className="py-32 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
               <BookOpen size={48} className="text-slate-300 mx-auto mb-4" />
               <p className="text-slate-600 font-bold text-xl">لا توجد دورات مطابقة للبحث حالياً.</p>
            </div>
          )}
        </main>
      </div>
    );
  }

  // --- VIEW: COURSE DETAILS ---
  if (view === 'courseDetails' && activeCourse) {
    const percent = getCourseProgress(activeCourse);
    const totalLessons = activeCourse.sections?.reduce((acc, s) => acc + (s.lessons?.length || 0), 0) || 0;

    return (
      <div className="min-h-screen bg-[#f8fafc] font-sans pb-20" dir={isRTL ? "rtl" : "ltr"}>
        <style>{globalFontStyles}</style>
        <header className="bg-white border-b px-6 py-4 flex items-center sticky top-0 z-40 shadow-sm">
          <button onClick={() => { setActiveCourse(null); setView('dashboard'); }} className="text-slate-500 hover:text-indigo-600 font-bold flex items-center gap-2 transition-colors">
            {isRTL ? <ArrowRight size={20}/> : <ArrowLeft size={20}/>} عودة للمسارات
          </button>
        </header>

        <main className="max-w-5xl mx-auto mt-10 p-6 space-y-8">
          <div className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-sm border border-slate-100 flex flex-col md:flex-row gap-10 items-center">
            <div className="w-full md:w-1/3 aspect-[4/3] rounded-3xl overflow-hidden shadow-lg bg-slate-100 flex-shrink-0">
               {activeCourse.thumbnailUrl ? (
                 <img src={activeCourse.thumbnailUrl} alt={activeCourse.title} className="w-full h-full object-cover" />
               ) : (
                 <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center">
                    <BookOpen size={64} className="text-white/50" />
                 </div>
               )}
            </div>
            <div className="flex-1 space-y-6">
              {ENABLE_CATEGORIES && (
                <div className="inline-block bg-indigo-50 text-indigo-600 px-3 py-1 rounded-lg text-xs font-bold mb-2">
                  {activeCourse.category || 'عام'}
                </div>
              )}
              <h1 className="text-3xl md:text-4xl font-black text-slate-900 leading-tight">{activeCourse.title}</h1>
              <p className="text-slate-600 text-lg leading-relaxed">{activeCourse.description}</p>
              
              <div className="flex flex-wrap gap-6 py-4 border-y border-slate-100">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-400 uppercase">الدروس</p>
                  <p className="font-bold text-slate-800">{totalLessons} درس</p>
                </div>
                <div className="space-y-1 w-full md:w-auto flex-1 min-w-[200px]">
                  <p className="text-xs font-bold text-slate-400 uppercase mb-2">التقدم ({percent}%)</p>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${percent}%` }}></div>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => {
                  const firstLesson = activeCourse.sections?.[0]?.lessons?.[0];
                  if (firstLesson) {
                    setActiveLesson(firstLesson);
                    setView('video');
                  } else { alert('لا يوجد محتوى مضاف بعد.'); }
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-2xl font-bold shadow-xl shadow-indigo-200 transition-all flex items-center justify-center gap-3 w-full md:w-auto text-lg active:scale-95 disabled:opacity-50"
                disabled={totalLessons === 0}
              >
                <PlayCircle size={24} /> {percent > 0 ? t.continueWatching : t.startCourse}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
            <h2 className="text-2xl font-black text-slate-800 mb-8 flex items-center gap-3">
              <BookOpen size={24} className="text-indigo-500"/> {t.curriculum}
            </h2>
            <div className="space-y-6">
              {activeCourse.sections?.map((s, i) => (
                <div key={s.id} className="border border-slate-200 rounded-2xl overflow-hidden">
                  <div className="bg-slate-50 p-5 border-b border-slate-200 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800">الفصل {i + 1}: {s.title}</h3>
                    <span className="text-xs font-bold text-slate-500 bg-white px-3 py-1 rounded-lg border">{s.lessons?.length || 0} دروس</span>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {s.lessons?.map((l, j) => (
                      <div key={l.id} className="p-4 px-6 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                        {progress.includes(l.id) ? <CheckCircle size={20} className="text-emerald-500"/> : <PlayCircle size={20} className="text-slate-300"/>}
                        <span className={`font-medium text-sm flex-1 ${progress.includes(l.id) ? 'text-slate-500 line-through' : 'text-slate-700'}`}>
                          {j + 1}. {l.title}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // --- VIEW: VIDEO PLAYER (Immersive) ---
  if (view === 'video' && activeCourse && activeLesson) {
    const youtubeUrl = getYoutubeEmbedUrl(activeLesson.videoUrl);
    
    let flatLessons = [];
    activeCourse.sections?.forEach(s => s.lessons?.forEach(l => flatLessons.push(l)));
    const currentIndex = flatLessons.findIndex(l => l.id === activeLesson.id);
    const nextLesson = flatLessons[currentIndex + 1];
    const prevLesson = flatLessons[currentIndex - 1];

    const [activeTab, setActiveTab] = useState('curriculum'); 
    const [note, setNote] = useState(''); 

    return (
      <div className="h-screen flex flex-col bg-[#0B0F19] text-slate-200 font-sans" dir={isRTL ? "rtl" : "ltr"}>
        <style>{globalFontStyles}</style>
        <header className="p-4 px-6 border-b border-white/10 flex justify-between items-center bg-[#0B0F19] z-20">
          <button onClick={() => setView('courseDetails')} className="text-slate-400 hover:text-white font-bold flex items-center gap-2 transition-colors">
            {isRTL ? <ArrowRight size={18}/> : <ArrowLeft size={18}/>} عودة لتفاصيل الدورة
          </button>
          <div className="text-center hidden md:block">
            <h1 className="font-bold text-white text-lg">{activeCourse.title}</h1>
          </div>
          <div className="flex gap-2">
            <button onClick={() => prevLesson && setActiveLesson(prevLesson)} disabled={!prevLesson} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"><ArrowRight size={20}/></button>
            <button onClick={() => nextLesson && setActiveLesson(nextLesson)} disabled={!nextLesson} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"><ArrowLeft size={20}/></button>
          </div>
        </header>

        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          <div className="flex-1 flex flex-col relative bg-black overflow-hidden">
            <Watermark email={user.email} />
            
            <div className="flex-1 w-full h-full relative">
              {youtubeUrl ? (
                <iframe src={youtubeUrl} className="w-full h-full" allow="autoplay; fullscreen" allowFullScreen></iframe>
              ) : activeLesson.videoUrl ? (
                <video src={activeLesson.videoUrl} controls controlsList="nodownload" className="w-full h-full object-contain" onContextMenu={e => e.preventDefault()} />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center opacity-30">
                   <Video size={64} className="mb-4" />
                   <p className="font-bold">رابط الفيديو غير متوفر</p>
                </div>
              )}
            </div>

            <div className="bg-[#0B0F19] border-t border-white/10 p-6 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div>
                <h2 className="text-2xl font-bold text-white">{activeLesson.title}</h2>
              </div>
              {!isAdmin && (
                <button 
                  onClick={() => toggleLesson(activeLesson.id)} 
                  className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${progress.includes(activeLesson.id) ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50' : 'bg-indigo-600 text-white hover:bg-indigo-500'}`}
                >
                  <CheckCircle size={20}/>
                  {progress.includes(activeLesson.id) ? t.completed : t.markComplete}
                </button>
              )}
            </div>
          </div>
          
          <div className="w-full lg:w-[400px] border-l border-white/10 bg-[#0F1523] flex flex-col z-10">
            <div className="flex border-b border-white/10">
              <button onClick={() => setActiveTab('curriculum')} className={`flex-1 p-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'curriculum' ? 'border-indigo-500 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>المحتوى</button>
              <button onClick={() => setActiveTab('notes')} className={`flex-1 p-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'notes' ? 'border-indigo-500 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>ملاحظاتي</button>
            </div>
            
            <div className="flex-1 overflow-y-auto hide-scroll p-2">
              {activeTab === 'curriculum' && (
                <div className="p-4 space-y-6">
                  {activeCourse.sections?.map(s => (
                    <div key={s.id} className="space-y-2">
                      <h3 className="text-xs font-black text-slate-500 uppercase px-2 mb-3">{s.title}</h3>
                      <div className="space-y-1">
                        {s.lessons?.map((l, i) => (
                          <button 
                            key={l.id} 
                            onClick={() => setActiveLesson(l)} 
                            className={`w-full text-right p-4 rounded-xl text-sm transition-all flex items-start gap-3 ${activeLesson.id === l.id ? 'bg-indigo-600/20 border border-indigo-500/30 text-white' : 'hover:bg-white/5 text-slate-400'}`}
                          >
                            <div className="mt-0.5">
                              {progress.includes(l.id) ? <CheckCircle size={16} className="text-emerald-500"/> : <PlayCircle size={16} className="opacity-50"/>}
                            </div>
                            <span className="flex-1 leading-snug">{i+1}. {l.title}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'notes' && (
                <div className="p-6 h-full flex flex-col">
                  <h3 className="font-bold text-white mb-4 flex items-center gap-2"><FileText size={18}/> ملاحظات خاصة بالدرس</h3>
                  <textarea 
                    className="flex-1 w-full bg-black/30 border border-white/10 rounded-xl p-4 text-sm outline-none focus:border-indigo-500 text-white resize-none"
                    placeholder="اكتب ملاحظاتك هنا للرجوع إليها لاحقاً..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  ></textarea>
                  <p className="text-xs text-slate-500 mt-4 text-center">الملاحظات تحفظ محلياً في متصفحك حالياً.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- VIEW: ADMIN (Modern Backoffice) ---
  if (view === 'admin' && isAdmin) {
    return (
      <div className="min-h-screen bg-[#f1f5f9] pb-32 font-sans" dir="rtl">
        <style>{globalFontStyles}</style>
        <header className="bg-slate-900 text-white p-5 px-8 flex justify-between items-center sticky top-0 z-50 shadow-xl">
           <div className="flex items-center gap-4">
             <button onClick={() => setView('dashboard')} className="text-slate-300 hover:text-white bg-white/10 px-4 py-2 rounded-xl transition-colors flex items-center gap-2 text-sm font-bold">
               <ArrowRight size={16} /> خروج للواجهة
             </button>
             <h1 className="text-xl font-black tracking-widest hidden sm:block">ADMIN <span className="text-indigo-500">WORKSPACE</span></h1>
           </div>
           <button onClick={() => alert('النظام يحفظ بياناتك لحظياً في Firestore')} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-2.5 rounded-xl transition-all shadow-lg flex items-center gap-2 text-sm">
             <CheckCircle size={16}/> حفظ التعديلات
           </button>
        </header>

        <main className="p-6 md:p-10 max-w-6xl mx-auto space-y-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-black text-slate-800">إدارة الكورسات (Courses Meta)</h2>
            <button 
              onClick={() => {
                saveCourse({ id: Date.now().toString(), title: 'عنوان الكورس الجديد', description: '', thumbnailUrl: '', category: 'medical', status: 'draft', sections: [] });
              }}
              className="bg-slate-800 text-white px-5 py-3 rounded-xl font-bold hover:bg-black transition-colors flex items-center gap-2 shadow-sm"
            >
              <Plus size={18} /> إنشاء كورس
            </button>
          </div>

          {courses.map((course) => (
            <div key={course.id} className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200 overflow-hidden relative mb-8">
              
              {/* Course Meta Data */}
              <div className="grid md:grid-cols-2 gap-6 mb-8 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-1 block">عنوان الكورس (Title)</label>
                    <input className="w-full bg-white border border-slate-200 p-3 rounded-xl focus:border-indigo-500 outline-none font-bold" value={course.title} onChange={e => saveCourse({...course, title: e.target.value})}/>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-1 block">الوصف (Description)</label>
                    <textarea className="w-full bg-white border border-slate-200 p-3 rounded-xl focus:border-indigo-500 outline-none min-h-[80px]" value={course.description} onChange={e => saveCourse({...course, description: e.target.value})}/>
                  </div>
                </div>
                
                <div className="space-y-4">
                  {/* Image Upload Component */}
                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-1 block">صورة الغلاف (Thumbnail)</label>
                    <div className="flex items-center gap-3">
                      {course.thumbnailUrl ? (
                        <img src={course.thumbnailUrl} alt="Thumbnail" className="w-14 h-14 object-cover rounded-xl border border-slate-200 shadow-sm" />
                      ) : (
                        <div className="w-14 h-14 bg-slate-200 rounded-xl flex items-center justify-center text-slate-400">
                          <ImageIcon size={20} />
                        </div>
                      )}
                      <label className={`flex-1 bg-white border border-slate-200 p-3 rounded-xl cursor-pointer hover:border-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2 text-sm font-bold ${uploadingImageId === course.id ? 'opacity-50 pointer-events-none' : 'text-slate-600'}`}>
                         <Upload size={18} />
                         {uploadingImageId === course.id ? 'جاري الرفع...' : 'رفع صورة من الجهاز'}
                         <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, course)} disabled={uploadingImageId === course.id} />
                      </label>
                    </div>
                  </div>
                  
                  <div className="flex gap-4">
                    {/* إخفاء التصنيفات في لوحة الأدمن بناءً على المتغير */}
                    {ENABLE_CATEGORIES && (
                      <div className="flex-1">
                        <label className="text-xs font-bold text-slate-500 mb-1 block">التصنيف (Category)</label>
                        <select className="w-full bg-white border border-slate-200 p-3 rounded-xl outline-none font-bold" value={course.category || 'medical'} onChange={e => saveCourse({...course, category: e.target.value})}>
                          <option value="medical">طبي</option>
                          <option value="engineering">هندسي</option>
                          <option value="business">أعمال</option>
                        </select>
                      </div>
                    )}
                    <div className="flex-1">
                      <label className="text-xs font-bold text-slate-500 mb-1 block">الحالة (Status)</label>
                      <select className="w-full bg-white border border-slate-200 p-3 rounded-xl outline-none font-bold" value={course.status || 'draft'} onChange={e => saveCourse({...course, status: e.target.value})}>
                        <option value="draft">مسودة (Draft)</option>
                        <option value="published">منشور (Published)</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="col-span-full flex justify-end mt-2 border-t border-slate-200 pt-4">
                  <button onClick={() => deleteCourse(course.id)} className="text-red-500 bg-red-50 hover:bg-red-500 hover:text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2"><Trash2 size={16}/> حذف الكورس بالكامل</button>
                </div>
              </div>

              {/* Sections & Lessons Builder */}
              <div className="space-y-6 border-t border-slate-200 pt-8">
                <div className="flex justify-between items-center mb-6">
                   <h3 className="font-black text-slate-800 text-lg flex items-center gap-2">
                     <BookOpen size={20} className="text-indigo-500" /> البناء المنهجي (Curriculum Builder)
                   </h3>
                   <button onClick={() => {
                     const sections = [...(course.sections||[]), {id: Date.now().toString(), title: 'فصل جديد', lessons: []}];
                     saveCourse({...course, sections});
                   }} className="bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white px-5 py-2.5 rounded-xl font-bold transition-colors text-sm shadow-sm">إضافة فصل (Section) +</button>
                </div>

                {course.sections?.map((section, sIdx) => (
                  <div key={section.id} className="bg-white border border-slate-300 p-6 rounded-2xl shadow-sm">
                    <div className="flex gap-3 mb-6">
                      <div className="flex flex-col gap-1">
                        <button onClick={() => saveCourse({...course, sections: moveItem(course.sections, sIdx, 'up')})} className="bg-slate-100 p-1 rounded hover:bg-slate-200"><ArrowUp size={14}/></button>
                        <button onClick={() => saveCourse({...course, sections: moveItem(course.sections, sIdx, 'down')})} className="bg-slate-100 p-1 rounded hover:bg-slate-200"><ArrowDown size={14}/></button>
                      </div>
                      <input className="font-bold text-lg bg-transparent border-b-2 border-slate-200 focus:border-indigo-500 outline-none flex-1 pb-1" value={section.title} placeholder="عنوان الفصل..." onChange={e => {
                        const sections = course.sections.map(s => s.id === section.id ? {...s, title: e.target.value} : s);
                        saveCourse({...course, sections});
                      }}/>
                      <button onClick={() => {
                        if(window.confirm('حذف الفصل بدروسه؟')) {
                          const sections = course.sections.filter(s => s.id !== section.id);
                          saveCourse({...course, sections});
                        }
                      }} className="text-red-300 hover:text-red-500 p-2"><Trash2 size={18}/></button>
                    </div>
                    
                    <div className="space-y-3 pl-8 border-r-2 border-indigo-100 ml-2">
                      {section.lessons?.map((lesson, lIdx) => (
                        <div key={lesson.id} className="flex flex-wrap md:flex-nowrap gap-3 items-center bg-slate-50 p-3 rounded-xl border border-slate-200 hover:border-indigo-300 transition-colors">
                          <div className="flex flex-col gap-1">
                            <button onClick={() => {
                              const newLessons = moveItem(section.lessons, lIdx, 'up');
                              const sections = course.sections.map(s => s.id === section.id ? {...s, lessons: newLessons} : s);
                              saveCourse({...course, sections});
                            }} className="text-slate-400 hover:text-indigo-600"><ArrowUp size={14}/></button>
                            <button onClick={() => {
                              const newLessons = moveItem(section.lessons, lIdx, 'down');
                              const sections = course.sections.map(s => s.id === section.id ? {...s, lessons: newLessons} : s);
                              saveCourse({...course, sections});
                            }} className="text-slate-400 hover:text-indigo-600"><ArrowDown size={14}/></button>
                          </div>
                          <div className="bg-indigo-100 text-indigo-600 p-2 rounded-lg hidden md:block"><Video size={16} /></div>
                          <input className="flex-[2] p-2 text-sm outline-none font-bold bg-white border border-slate-200 rounded-lg focus:border-indigo-500" value={lesson.title} placeholder="عنوان الدرس" onChange={e => {
                            const sections = course.sections.map(s => s.id === section.id ? {...s, lessons: s.lessons.map(l => l.id === lesson.id ? {...l, title: e.target.value} : l)} : s);
                            saveCourse({...course, sections});
                          }}/>
                          <input className="flex-[4] p-2 text-xs outline-none font-mono bg-white border border-slate-200 rounded-lg focus:border-indigo-500" value={lesson.videoUrl} placeholder="رابط يوتيوب أو MP4 المباشر" dir="ltr" onChange={e => {
                            const sections = course.sections.map(s => s.id === section.id ? {...s, lessons: s.lessons.map(l => l.id === lesson.id ? {...l, videoUrl: e.target.value} : l)} : s);
                            saveCourse({...course, sections});
                          }}/>
                          <button onClick={() => {
                            const sections = course.sections.map(s => s.id === section.id ? {...s, lessons: s.lessons.filter(l => l.id !== lesson.id)} : s);
                            saveCourse({...course, sections});
                          }} className="text-slate-400 hover:text-red-500 p-2"><X size={18}/></button>
                        </div>
                      ))}
                      <button onClick={() => {
                        const sections = course.sections.map(s => s.id === section.id ? {...s, lessons: [...(s.lessons||[]), {id: Date.now().toString(), title: 'درس جديد', videoUrl: ''}]} : s);
                        saveCourse({...course, sections});
                      }} className="text-xs text-indigo-600 font-bold mt-2 bg-white hover:bg-indigo-50 border border-indigo-200 px-4 py-2 rounded-lg transition-colors flex items-center gap-2">
                        <Plus size={14}/> إضافة درس (Lesson)
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

  return null;
}
