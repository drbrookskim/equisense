// whisky-screens.jsx — all screen components
// Exports all screens to window

const { useState, useEffect, useRef } = React;
const D = window.WHISKY_APP_DATA;

function calcMBTI(answers) {
  const s = { E:0,I:0,N:0,S:0,T:0,F:0,J:0,P:0 };
  answers.forEach(a => { if(a) s[a]++; });
  return (s.E>=s.I?'E':'I')+(s.N>=s.S?'N':'S')+(s.T>=s.F?'T':'F')+(s.J>=s.P?'J':'P');
}

function useTweaks() {
  const [card, setCard] = useState(window._tweakCard||'glass');
  const [layout, setLayout] = useState(window._tweakLayout||'card');
  useEffect(()=>{
    const h=()=>{ setCard(window._tweakCard); setLayout(window._tweakLayout); };
    window.addEventListener('tweakchange',h);
    return ()=>window.removeEventListener('tweakchange',h);
  },[]);
  return { card, layout };
}

// ── SplashScreen ──────────────────────────────────────────────
function SplashScreen({ go, lang }) {
  const [in_, setIn] = useState(false);
  useEffect(()=>{ setTimeout(()=>setIn(true),80); },[]);
  return (
    <div style={{
      minHeight:'100vh', display:'flex', flexDirection:'column',
      alignItems:'center', justifyContent:'space-between',
      padding:'0 28px 48px',
      background:'radial-gradient(ellipse at 50% 18%, rgba(255,107,26,0.09) 0%, var(--bg) 65%)',
    }}>
      <div style={{
        width:'100%', paddingTop:60, opacity:in_?1:0, transition:'opacity 0.8s ease',
        display:'flex', alignItems:'center', gap:12,
      }}>
        <div style={{ flex:1, height:'1px', background:'var(--border)' }}/>
        <span style={{ color:'var(--text-muted)', fontSize:10, letterSpacing:3 }}>WHISKY × MBTI</span>
        <div style={{ flex:1, height:'1px', background:'var(--border)' }}/>
      </div>

      <div style={{
        display:'flex', flexDirection:'column', alignItems:'center', gap:28,
        opacity:in_?1:0,
        transform:in_?'translateY(0)':'translateY(28px)',
        transition:'all 0.8s cubic-bezier(0.22,1,0.36,1) 0.1s',
      }}>
        <div style={{ position:'relative' }}>
          <svg width="160" height="140" viewBox="0 0 180 150" fill="none">
            <defs>
              <linearGradient id="splashLiq" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#FF6B1A" stopOpacity="0.9"/>
                <stop offset="100%" stopColor="#FF6B1A" stopOpacity="0.4"/>
              </linearGradient>
              <linearGradient id="splashGlass" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="white" stopOpacity="0.04"/>
                <stop offset="38%" stopColor="white" stopOpacity="0.12"/>
                <stop offset="100%" stopColor="white" stopOpacity="0.02"/>
              </linearGradient>
              <clipPath id="splashClip">
                <path d="M25 14 L22 93 Q22 103 35 103 L145 103 Q158 103 158 93 L155 14 Z"/>
              </clipPath>
              <radialGradient id="splashIce" cx="40%" cy="35%" r="55%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.78)"/>
                <stop offset="100%" stopColor="rgba(200,235,255,0.22)"/>
              </radialGradient>
            </defs>
            <path d="M25 14 L22 93 Q22 103 35 103 L145 103 Q158 103 158 93 L155 14 Z"
              fill="url(#splashGlass)" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5"/>
            <g clipPath="url(#splashClip)">
              <rect x="22" y="55" width="136" height="48" fill="url(#splashLiq)"/>
              <ellipse cx="90" cy="55" rx="62" ry="4" fill="#FF6B1A" opacity="0.3"/>
            </g>
            <g clipPath="url(#splashClip)">
              <rect x="66" y="62" width="46" height="28" rx="6" fill="url(#splashIce)" opacity="0.5"/>
              <rect x="66" y="62" width="46" height="28" rx="6" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="0.75"/>
            </g>
            <rect x="25" y="14" width="130" height="7" rx="3.5" fill="rgba(255,255,255,0.1)"/>
            <path d="M34 22 L30 88" stroke="white" strokeWidth="2" opacity="0.06" strokeLinecap="round"/>
          </svg>
          <div style={{
            position:'absolute', inset:-20,
            background:'radial-gradient(circle, rgba(255,107,26,0.2) 0%, transparent 65%)',
            pointerEvents:'none',
          }}/>
        </div>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontFamily:'Playfair Display, serif', fontSize:52, fontWeight:700, lineHeight:1, color:'var(--text)', letterSpacing:-0.5 }}>Whisky</div>
          <div style={{ fontFamily:'Playfair Display, serif', fontSize:52, fontWeight:400, fontStyle:'italic', lineHeight:1, color:'var(--accent)', letterSpacing:2 }}>MBTI</div>
          <div style={{ marginTop:16, fontSize:13, letterSpacing:1, color:'var(--text-dim)', fontWeight:300 }}>
            {lang==='en'?'Find your perfect dram':'나에게 맞는 위스키를 찾아보세요'}
          </div>
        </div>
        <div style={{ display:'flex', gap:28 }}>
          {[['16',lang==='en'?'Types':'유형'],['16',lang==='en'?'Whiskies':'위스키'],['12',lang==='en'?'Questions':'문항']].map(([n,l])=>(
            <div key={l} style={{ textAlign:'center' }}>
              <div style={{ fontFamily:'Playfair Display', fontSize:30, fontWeight:700, color:'var(--accent)', lineHeight:1 }}>{n}</div>
              <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:3 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{
        width:'100%', display:'flex', flexDirection:'column', gap:10,
        opacity:in_?1:0, transform:in_?'translateY(0)':'translateY(16px)',
        transition:'all 0.8s cubic-bezier(0.22,1,0.36,1) 0.35s',
      }}>
        <button onClick={()=>go('onboarding')} style={{
          width:'100%', padding:'18px 0', background:'var(--accent)', border:'none', borderRadius:16,
          color:'#fff', fontFamily:'Noto Sans KR', fontWeight:600, fontSize:16, cursor:'pointer',
          boxShadow:'0 8px 32px var(--accent-glow)', letterSpacing:0.3,
        }}>{lang==='en'?'Discover My Whisky':'나의 위스키 찾기'}</button>
        <button onClick={()=>go('collection')} style={{
          width:'100%', padding:'14px 0', background:'none',
          border:'1px solid var(--border)', borderRadius:16,
          color:'var(--text-dim)', fontFamily:'Noto Sans KR', fontSize:14, cursor:'pointer',
        }}>{lang==='en'?'Browse Collection':'위스키 컬렉션 보기'}</button>
      </div>
    </div>
  );
}

// ── OnboardingScreen ──────────────────────────────────────────
function OnboardingScreen({ go, lang, profile }) {
  const w = profile.mbti ? D.WHISKY_DATA[profile.mbti] : null;
  return (
    <div style={{ minHeight:'100vh' }}>
      <NavBar title={lang==='en'?'Get Started':'시작하기'} onBack={()=>go('splash')}/>
      <div style={{ padding:'28px 20px' }}>
        {profile.mbti && w && (
          <div style={{
            background:'var(--accent-dim)', border:'1px solid var(--border)',
            borderRadius:14, padding:'14px 16px', marginBottom:24,
            display:'flex', alignItems:'center', gap:12,
          }}>
            <span style={{ fontSize:22 }}>{w.emoji}</span>
            <div>
              <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:2 }}>{lang==='en'?'Saved MBTI':'저장된 MBTI'}</div>
              <div style={{ fontFamily:'Playfair Display', fontSize:18, fontWeight:700, color:'var(--accent)', letterSpacing:2 }}>{profile.mbti}</div>
            </div>
            <button onClick={()=>go('result')} style={{
              marginLeft:'auto', padding:'8px 16px', background:'var(--accent)',
              border:'none', borderRadius:10, color:'#fff', fontFamily:'Noto Sans KR',
              fontSize:13, cursor:'pointer', fontWeight:500,
            }}>{lang==='en'?'View →':'보기 →'}</button>
          </div>
        )}
        <div style={{ fontFamily:'Playfair Display', fontSize:26, fontWeight:700, color:'var(--text)', lineHeight:1.25, marginBottom:8 }}>
          {lang==='en'?'How would you like to start?':'MBTI를 어떻게\n확인하시겠어요?'}
        </div>
        <div style={{ color:'var(--text-muted)', fontSize:13, marginBottom:28 }}>
          {lang==='en'?'Take the quiz or enter your type directly':'테스트를 진행하거나 직접 유형을 선택하세요'}
        </div>
        {[
          { id:'quiz', icon:'📝', title:lang==='en'?'Take the Quiz':'MBTI 테스트 하기',
            sub: lang==='en'?'12 questions · ~3 min · whisky-themed':'12가지 질문 · 약 3분 · 위스키 테마', badge:true },
          { id:'direct', icon:'🔢', title:lang==='en'?'I Know My MBTI':'이미 알고 있어요',
            sub: lang==='en'?'Select from 16 types and jump to results':'16가지 유형에서 선택 후 바로 결과로', badge:false },
          { id:'biorhythm', icon:'🌊', title:lang==='en'?'Biorhythm + MBTI':'바이오리듬 + MBTI',
            sub: lang==='en'?'Today\'s whisky based on your life cycles':'오늘의 신체·감성·지성 상태로 위스키 추천', badge:false },
        ].map(opt=>(
          <button key={opt.id} onClick={()=>go(opt.id)} style={{
            background:'none', border:'1px solid var(--border-soft)', borderRadius:20,
            padding:'22px 20px', cursor:'pointer', textAlign:'left', width:'100%',
            marginBottom:12, transition:'border-color 0.2s',
          }}
          onMouseEnter={e=>e.currentTarget.style.borderColor='var(--accent)'}
          onMouseLeave={e=>e.currentTarget.style.borderColor='var(--border-soft)'}
          >
            <div style={{ display:'flex', alignItems:'flex-start', gap:14 }}>
              <div style={{
                width:46, height:46, borderRadius:13, flexShrink:0,
                background:'var(--accent-dim)',
                display:'flex', alignItems:'center', justifyContent:'center', fontSize:22,
              }}>{opt.icon}</div>
              <div>
                <div style={{ fontFamily:'Playfair Display', fontSize:17, fontWeight:600, color:'var(--text)', marginBottom:5 }}>{opt.title}</div>
                <div style={{ color:'var(--text-dim)', fontSize:13, lineHeight:1.5 }}>{opt.sub}</div>
                {opt.badge && (
                  <div style={{
                    marginTop:8, display:'inline-block', background:'var(--accent)',
                    color:'#fff', fontSize:11, padding:'3px 9px', borderRadius:5,
                    fontFamily:'Noto Sans KR', fontWeight:500,
                  }}>{lang==='en'?'Recommended':'추천'}</div>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── QuizScreen ────────────────────────────────────────────────
function QuizScreen({ go, lang, setMBTI }) {
  const qs = D.QUIZ_QUESTIONS;
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState(Array(qs.length).fill(null));
  const [chosen, setChosen] = useState(null);
  const q = qs[idx];

  const pick = (val) => {
    setChosen(val);
    const next = [...answers]; next[idx]=val; setAnswers(next);
    setTimeout(()=>{
      if(idx<qs.length-1){ setIdx(idx+1); setChosen(null); }
      else { const mbti=calcMBTI(next); setMBTI(mbti); go('result'); }
    }, 300);
  };

  return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column' }}>
      <NavBar
        title={lang==='en'?`Question ${idx+1} / ${qs.length}`:`${idx+1} / ${qs.length} 번째 질문`}
        onBack={()=>idx>0?setIdx(idx-1):go('onboarding')}
      />
      <div style={{ padding:'0 20px 8px' }}>
        <div style={{ height:2, background:'var(--border-soft)', borderRadius:1, overflow:'hidden', margin:'12px 0 6px' }}>
          <div style={{ height:'100%', width:`${(idx+1)/qs.length*100}%`, background:'var(--accent)', borderRadius:1, transition:'width 0.4s cubic-bezier(0.22,1,0.36,1)' }}/>
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'var(--text-muted)' }}>
          <span style={{ color:'var(--accent)' }}>{q.dim}</span>
          <span>{Math.round((idx+1)/qs.length*100)}%</span>
        </div>
      </div>
      <div style={{ flex:1, padding:'24px 20px', display:'flex', flexDirection:'column', gap:20 }}>
        <div key={`q${idx}`} style={{ animation:'fadeSlideIn 0.3s ease both' }}>
          <div style={{ fontFamily:'Playfair Display', fontSize:22, fontWeight:600, lineHeight:1.4, color:'var(--text)', marginBottom:4 }}>
            {lang==='en'?q.en:q.ko}
          </div>
          {lang==='ko' && <div style={{ fontSize:12, color:'var(--text-muted)', fontStyle:'italic' }}>{q.en}</div>}
        </div>
        <div key={`opts${idx}`} style={{ display:'flex', flexDirection:'column', gap:12, animation:'fadeSlideIn 0.35s 0.05s ease both' }}>
          {['A','B'].map(opt=>{
            const o=q[opt]; const sel=chosen===o.val;
            return (
              <button key={opt} onClick={()=>pick(o.val)} style={{
                background:sel?'var(--accent-dim)':'var(--card)',
                border:`1.5px solid ${sel?'var(--accent)':'var(--border-soft)'}`,
                borderRadius:16, padding:'18px', cursor:'pointer', textAlign:'left',
                width:'100%', transition:'all 0.18s', transform:sel?'scale(0.98)':'scale(1)',
              }}>
                <div style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
                  <div style={{
                    width:28, height:28, borderRadius:8, flexShrink:0,
                    background:sel?'var(--accent)':'var(--border-soft)',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    color:sel?'#fff':'var(--text-muted)', fontSize:12, fontWeight:700,
                    fontFamily:'Playfair Display', transition:'all 0.18s',
                  }}>{opt}</div>
                  <div>
                    <div style={{ color:sel?'var(--accent)':'var(--text)', fontSize:15, lineHeight:1.5, fontWeight:sel?500:400 }}>
                      {lang==='en'?o.en:o.ko}
                    </div>
                    {lang==='ko' && <div style={{ color:'var(--text-muted)', fontSize:12, marginTop:3, fontStyle:'italic' }}>{o.en}</div>}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── DirectScreen ──────────────────────────────────────────────
function DirectScreen({ go, lang, setMBTI, currentMBTI }) {
  const [hovered, setHovered] = useState(null);
  return (
    <div style={{ minHeight:'100vh' }}>
      <NavBar title={lang==='en'?'Select Your Type':'MBTI 선택'} onBack={()=>go('onboarding')}/>
      <div style={{ padding:'16px 16px 80px' }}>
        <div style={{ color:'var(--text-muted)', fontSize:13, marginBottom:18 }}>
          {lang==='en'?'Tap your personality type':'나의 성격 유형을 탭하세요'}
        </div>
        {D.MBTI_GRID.map((row,ri)=>(
          <div key={ri} style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:8 }}>
            {row.map(type=>{
              const w=D.WHISKY_DATA[type]; const sel=currentMBTI===type; const hov=hovered===type;
              return (
                <button key={type} onClick={()=>{ setMBTI(type); go('result'); }}
                  onMouseEnter={()=>setHovered(type)} onMouseLeave={()=>setHovered(null)}
                  style={{
                    background:sel?'var(--accent)':hov?'var(--accent-dim)':'var(--card)',
                    border:`1px solid ${sel?'var(--accent)':'var(--border-soft)'}`,
                    borderRadius:14, padding:'14px 8px', cursor:'pointer',
                    transition:'all 0.18s', transform:hov?'translateY(-2px)':'none',
                    display:'flex', flexDirection:'column', alignItems:'center', gap:5,
                  }}>
                  <span style={{ fontSize:18 }}>{w.emoji}</span>
                  <span style={{ fontFamily:'Playfair Display', fontSize:13, fontWeight:700, color:sel?'#fff':'var(--text)', letterSpacing:0.5 }}>{type}</span>
                  <span style={{ fontSize:10, color:sel?'rgba(255,255,255,0.7)':'var(--text-muted)', textAlign:'center', lineHeight:1.2 }}>
                    {lang==='en'?w.character:w.characterKo}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
        <div style={{ marginTop:8, padding:'14px 16px', background:'var(--card)', border:'1px solid var(--border-soft)', borderRadius:14, display:'grid', gridTemplateColumns:'1fr 1fr', gap:'7px 18px' }}>
          {[['E','Extroverted/외향'],['I','Introverted/내향'],['N','Intuitive/직관'],['S','Sensing/감각'],['T','Thinking/사고'],['F','Feeling/감정'],['J','Judging/판단'],['P','Perceiving/인식']].map(([l,d])=>(
            <div key={l} style={{ display:'flex', gap:7, alignItems:'center', fontSize:12 }}>
              <span style={{ color:'var(--accent)', fontFamily:'Playfair Display', fontWeight:700, minWidth:12 }}>{l}</span>
              <span style={{ color:'var(--text-muted)' }}>{d}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── BiorythmScreen ────────────────────────────────────────────
function BiorythmScreen({ go, lang, profile, setProfile, setMBTI }) {
  const [birthdate, setBirthdate] = useState(profile.birthdate||'');
  const [submitted, setSubmitted] = useState(!!profile.birthdate);

  const submit = () => {
    if (!birthdate) return;
    setProfile(p=>({ ...p, birthdate }));
    setSubmitted(true);
  };

  return (
    <div style={{ minHeight:'100vh' }}>
      <NavBar title={lang==='en'?'Biorhythm':'바이오리듬'} onBack={()=>go('onboarding')}/>
      <div style={{ padding:'24px 16px 80px' }}>
        <div style={{ fontFamily:'Playfair Display', fontSize:22, fontWeight:700, color:'var(--text)', marginBottom:8 }}>
          {lang==='en'?'Your Biorhythm Today':'오늘의 바이오리듬'}
        </div>
        <div style={{ color:'var(--text-muted)', fontSize:13, marginBottom:24 }}>
          {lang==='en'
            ? 'Physical (23d) · Emotional (28d) · Intellectual (33d) cycles guide your perfect dram today.'
            : '신체(23일) · 감성(28일) · 지성(33일) 주기로 오늘의 최적 위스키를 추천드립니다.'}
        </div>

        {!submitted ? (
          <GlassCard style={{ padding:24 }}>
            <div style={{ fontFamily:'Playfair Display', fontSize:16, color:'var(--text)', marginBottom:16 }}>
              {lang==='en'?'Enter your birthdate':'생년월일을 입력해주세요'}
            </div>
            <input
              type="date" value={birthdate}
              onChange={e=>setBirthdate(e.target.value)}
              style={{
                width:'100%', padding:'12px 14px',
                background:'rgba(255,255,255,0.05)', border:'1px solid var(--border-soft)',
                borderRadius:12, color:'var(--text)', fontFamily:'Noto Sans KR', fontSize:15,
                marginBottom:16,
                colorScheme:'dark',
              }}
            />
            <button onClick={submit} disabled={!birthdate} style={{
              width:'100%', padding:'14px', background:birthdate?'var(--accent)':'rgba(255,107,26,0.3)',
              border:'none', borderRadius:12, color:'#fff',
              fontFamily:'Noto Sans KR', fontWeight:600, fontSize:15, cursor:birthdate?'pointer':'not-allowed',
            }}>
              {lang==='en'?'Calculate →':'계산하기 →'}
            </button>
          </GlassCard>
        ) : (
          <>
            <BiorythmWidget
              birthdate={profile.birthdate||birthdate}
              lang={lang} mbti={profile.mbti}
              onWhiskyHint={(type)=>{ setMBTI(type); go('result'); }}
            />
            <div style={{ marginTop:20, display:'flex', gap:10 }}>
              <button onClick={()=>go('result')} style={{
                flex:1, padding:'14px', background:'var(--accent)', border:'none', borderRadius:12,
                color:'#fff', fontFamily:'Noto Sans KR', fontWeight:600, fontSize:14, cursor:'pointer',
              }}>{lang==='en'?'My MBTI Whisky →':'나의 MBTI 위스키 →'}</button>
              <button onClick={()=>{ setSubmitted(false); setBirthdate(''); }} style={{
                flex:0.5, padding:'14px', background:'var(--card)', border:'1px solid var(--border-soft)',
                borderRadius:12, color:'var(--text-muted)', fontFamily:'Noto Sans KR', fontSize:13, cursor:'pointer',
              }}>{lang==='en'?'Reset':'재입력'}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── ResultScreen ──────────────────────────────────────────────
function ResultScreen({ go, lang, mbti, profile, setProfile }) {
  const { card, layout } = useTweaks();
  const [vis, setVis] = useState(false);
  const [poured, setPoured] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [saved, setSaved] = useState(profile.mbti===mbti);

  useEffect(()=>{ setTimeout(()=>setVis(true),80); setVis(false); setPoured(false); setSaved(profile.mbti===mbti); },[mbti]);

  if (!mbti) { setTimeout(()=>go('onboarding'),0); return null; }
  const w = D.WHISKY_DATA[mbti]; if(!w) return null;
  const isMinimal = layout==='minimal';
  const isGlass   = card==='glass';

  const save = () => {
    setProfile(p=>({ ...p, mbti, history:[mbti,...(p.history||[]).filter(x=>x!==mbti)].slice(0,5) }));
    setSaved(true);
  };

  return (
    <div style={{ minHeight:'100vh' }}>
      {showShare && <ShareCard mbti={mbti} lang={lang} onClose={()=>setShowShare(false)}/>}

      <NavBar
        title={lang==='en'?'Your Dram':'나의 위스키'}
        onBack={()=>go('onboarding')}
        right={
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={()=>setShowShare(true)} style={{
              background:'none', border:'1px solid var(--border-soft)',
              borderRadius:8, padding:'5px 10px', color:'var(--text-muted)',
              fontSize:13, cursor:'pointer',
            }}>↗</button>
            <button onClick={save} style={{
              background:saved?'var(--accent-dim)':'none',
              border:`1px solid ${saved?'var(--accent)':'var(--border-soft)'}`,
              borderRadius:8, padding:'5px 10px',
              color:saved?'var(--accent)':'var(--text-muted)',
              fontSize:12, cursor:'pointer', fontFamily:'Noto Sans KR', transition:'all 0.2s',
            }}>{saved?(lang==='en'?'✓ Saved':'✓ 저장됨'):(lang==='en'?'Save':'저장')}</button>
          </div>
        }
      />

      <div style={{ background:`radial-gradient(ellipse at 50% 0%, ${w.color}22 0%, transparent 55%)` }}>
        {/* MBTI badge */}
        <div style={{ padding:'20px 24px 0', opacity:vis?1:0, transform:vis?'translateY(0)':'translateY(16px)', transition:'all 0.5s cubic-bezier(0.22,1,0.36,1)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
            <div style={{ background:'var(--accent-dim)', border:'1px solid var(--border)', borderRadius:8, padding:'4px 12px' }}>
              <span style={{ fontFamily:'Playfair Display', fontSize:16, fontWeight:700, color:'var(--accent)', letterSpacing:2 }}>{mbti}</span>
            </div>
            <span style={{ color:'var(--text-dim)', fontSize:13 }}>· {lang==='en'?w.character:w.characterKo}</span>
          </div>

          {/* Pour animation — only on first view */}
          {!isMinimal && (
            <div style={{ display:'flex', justifyContent:'center', margin:'0 0 16px' }}>
              {!poured ? (
                <PourAnimation color={w.color} onComplete={()=>{ setPoured(true); setVis(true); }}/>
              ) : (
                <div style={{ opacity:1 }}>
                  <svg width="180" height="150" viewBox="0 0 180 150" fill="none">
                    <defs>
                      <linearGradient id={`rl-${mbti}`} x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor={w.color} stopOpacity="0.9"/>
                        <stop offset="100%" stopColor={w.color} stopOpacity="0.45"/>
                      </linearGradient>
                      <linearGradient id="rbg" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="white" stopOpacity="0.04"/>
                        <stop offset="38%" stopColor="white" stopOpacity="0.11"/>
                        <stop offset="100%" stopColor="white" stopOpacity="0.02"/>
                      </linearGradient>
                      <clipPath id={`rc-${mbti}`}><path d="M25 14 L22 93 Q22 103 35 103 L145 103 Q158 103 158 93 L155 14 Z"/></clipPath>
                      <radialGradient id="rig" cx="40%" cy="35%" r="55%"><stop offset="0%" stopColor="rgba(255,255,255,0.78)"/><stop offset="100%" stopColor="rgba(200,235,255,0.22)"/></radialGradient>
                    </defs>
                    <path d="M25 14 L22 93 Q22 103 35 103 L145 103 Q158 103 158 93 L155 14 Z" fill="url(#rbg)" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5"/>
                    <g clipPath={`url(#rc-${mbti})`}>
                      <rect x="22" y="55" width="136" height="48" fill={`url(#rl-${mbti})`}/>
                    </g>
                    <g clipPath={`url(#rc-${mbti})`}>
                      <rect x="66" y="62" width="46" height="28" rx="6" fill="url(#rig)" opacity="0.5"/>
                      <rect x="66" y="62" width="46" height="28" rx="6" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="0.75"/>
                    </g>
                    <rect x="25" y="14" width="130" height="7" rx="3.5" fill="rgba(255,255,255,0.1)"/>
                    <path d="M34 22 L30 88" stroke="white" strokeWidth="2" opacity="0.06" strokeLinecap="round"/>
                  </svg>
                  <div style={{ position:'absolute', inset:-16, background:`radial-gradient(circle at 50% 75%, ${w.color}28 0%, transparent 60%)`, pointerEvents:'none' }}/>
                </div>
              )}
            </div>
          )}

          <div style={{ fontFamily:'Playfair Display', fontSize:11, color:'var(--text-muted)', letterSpacing:2, marginBottom:5 }}>YOUR DRAM</div>
          <div style={{ fontFamily:'Playfair Display', fontSize:30, fontWeight:700, color:'var(--text)', lineHeight:1.2, marginBottom:3 }}>{w.name}</div>
          <div style={{ color:'var(--text-muted)', fontSize:13, marginBottom:16 }}>
            {lang==='en'?w.region:w.regionKo} · {w.age} · {w.abv}
          </div>
        </div>

        {/* Tags */}
        <div style={{ padding:'0 24px 14px', display:'flex', gap:8, flexWrap:'wrap', opacity:vis?1:0, transition:'opacity 0.6s ease 0.1s' }}>
          {(lang==='en'?w.tags:w.tagsKo).map(t=>(
            <span key={t} style={{ background:'var(--pill)', border:'1px solid var(--border)', borderRadius:20, padding:'5px 12px', color:'var(--accent)', fontSize:12 }}># {t}</span>
          ))}
        </div>
      </div>

      {/* Cards */}
      <div style={{ padding:'0 16px 96px', opacity:vis?1:0, transform:vis?'translateY(0)':'translateY(20px)', transition:'all 0.6s cubic-bezier(0.22,1,0.36,1) 0.15s' }}>
        <GlassCard glass={isGlass} style={{ padding:20, marginBottom:10 }}>
          <div style={{ color:'var(--text-dim)', fontSize:14, lineHeight:1.75 }}>{lang==='en'?w.desc:w.descKo}</div>
        </GlassCard>

        <GlassCard glass={isGlass} style={{ padding:20, marginBottom:10 }}>
          <div style={{ color:'var(--accent)', fontSize:11, letterSpacing:1.5, fontWeight:600, marginBottom:10 }}>{lang==='en'?'TASTING NOTES':'테이스팅 노트'}</div>
          <div style={{ color:'var(--text-dim)', fontSize:14, lineHeight:1.7 }}>{lang==='en'?w.tasting:w.tastingKo}</div>
        </GlassCard>

        <GlassCard glass={isGlass} style={{ padding:20, marginBottom:10 }}>
          <div style={{ color:'var(--accent)', fontSize:11, letterSpacing:1.5, fontWeight:600, marginBottom:16 }}>{lang==='en'?'FLAVOR PROFILE':'풍미 프로파일'}</div>
          <FlavorBars flavor={w.flavor} lang={lang}/>
        </GlassCard>

        <GlassCard glass={isGlass} style={{ padding:20, marginBottom:10 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <div style={{ color:'var(--accent)', fontSize:11, letterSpacing:1.5, fontWeight:600, marginBottom:8 }}>{lang==='en'?'FOOD PAIRING':'푸드 페어링'}</div>
              <div style={{ color:'var(--text-dim)', fontSize:14 }}>{lang==='en'?w.pair:w.pairKo}</div>
            </div>
            <span style={{ fontSize:28 }}>🍽️</span>
          </div>
        </GlassCard>

        {/* Price card */}
        {D.WHISKY_PRICE[mbti] && (
          <GlassCard glass={isGlass} style={{ padding:20, marginBottom:20 }}>
            <div style={{ color:'var(--accent)', fontSize:11, letterSpacing:1.5, fontWeight:600, marginBottom:14 }}>{lang==='en'?'PRICE & WHERE TO BUY':'가격 및 구매처'}</div>
            <div style={{ display:'flex', gap:12, marginBottom:14 }}>
              <div style={{ flex:1, background:'var(--accent-dim)', border:'1px solid var(--border)', borderRadius:12, padding:'10px 12px', textAlign:'center' }}>
                <div style={{ fontSize:10, color:'var(--text-muted)', marginBottom:4 }}>KRW</div>
                <div style={{ fontFamily:'Playfair Display', fontSize:15, fontWeight:700, color:'var(--text)' }}>₩{D.WHISKY_PRICE[mbti].krw}</div>
              </div>
              <div style={{ flex:1, background:'var(--card)', border:'1px solid var(--border-soft)', borderRadius:12, padding:'10px 12px', textAlign:'center' }}>
                <div style={{ fontSize:10, color:'var(--text-muted)', marginBottom:4 }}>USD</div>
                <div style={{ fontFamily:'Playfair Display', fontSize:15, fontWeight:700, color:'var(--text)' }}>{D.WHISKY_PRICE[mbti].usd}</div>
              </div>
              <div style={{ flex:1, background:'var(--card)', border:'1px solid var(--border-soft)', borderRadius:12, padding:'10px 12px', textAlign:'center' }}>
                <div style={{ fontSize:10, color:'var(--text-muted)', marginBottom:4 }}>Tier</div>
                <div style={{ fontFamily:'Playfair Display', fontSize:13, fontWeight:700, color:'var(--text)' }}>
                  {lang==='en'?D.WHISKY_PRICE[mbti].tier:D.WHISKY_PRICE[mbti].tierKo}
                </div>
              </div>
            </div>
            <div style={{ color:'var(--text-muted)', fontSize:11, marginBottom:8 }}>{lang==='en'?'Where to buy in Korea:':'국내 구매처'}</div>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {D.WHISKY_PRICE[mbti].buy.map(s=>(
                <span key={s} style={{ background:'var(--border-soft)', borderRadius:8, padding:'4px 10px', color:'var(--text-dim)', fontSize:12 }}>{s}</span>
              ))}
            </div>
          </GlassCard>
        )}

        <div style={{ display:'flex', gap:10 }}>
          <button onClick={()=>go('detail')} style={{
            flex:1, padding:'16px 0', background:'var(--accent)', border:'none', borderRadius:14,
            color:'#fff', fontFamily:'Noto Sans KR', fontWeight:600, fontSize:15, cursor:'pointer',
            boxShadow:'0 8px 24px var(--accent-glow)',
          }}>{lang==='en'?'Full Details →':'상세 정보 →'}</button>
          <button onClick={()=>go('direct')} style={{
            flex:1, padding:'16px 0', background:'none', border:'1px solid var(--border)',
            borderRadius:14, color:'var(--text-dim)', fontFamily:'Noto Sans KR', fontSize:14, cursor:'pointer',
          }}>{lang==='en'?'Try Another':'다른 유형'}</button>
        </div>
      </div>
    </div>
  );
}

// ── DetailScreen ──────────────────────────────────────────────
function DetailScreen({ go, lang, mbti }) {
  const { card } = useTweaks();
  const [showShare, setShowShare] = useState(false);
  if (!mbti) { setTimeout(()=>go('result'),0); return null; }
  const w = D.WHISKY_DATA[mbti]; if(!w) return null;
  const isGlass = card==='glass';
  const price = D.WHISKY_PRICE[mbti];

  return (
    <div style={{ minHeight:'100vh' }}>
      {showShare && <ShareCard mbti={mbti} lang={lang} onClose={()=>setShowShare(false)}/>}
      <NavBar title={w.name} onBack={()=>go('result')}
        right={<button onClick={()=>setShowShare(true)} style={{ background:'none', border:'1px solid var(--border-soft)', borderRadius:8, padding:'5px 10px', color:'var(--text-muted)', fontSize:13, cursor:'pointer' }}>↗</button>}
      />

      <div style={{ padding:'24px 24px 20px', background:`linear-gradient(180deg, ${w.color}22 0%, transparent 100%)`, display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div>
          <div style={{ background:'var(--pill)', border:'1px solid var(--border)', borderRadius:6, padding:'3px 10px', display:'inline-block', marginBottom:10 }}>
            <span style={{ color:'var(--accent)', fontSize:11, letterSpacing:1, fontWeight:600 }}>{lang==='en'?w.region.toUpperCase():w.regionKo.toUpperCase()}</span>
          </div>
          <div style={{ fontFamily:'Playfair Display', fontSize:24, fontWeight:700, color:'var(--text)', lineHeight:1.2, marginBottom:4 }}>{w.name}</div>
          <div style={{ color:'var(--text-muted)', fontSize:13 }}>{w.age} · ABV {w.abv}</div>
        </div>
        <span style={{ fontSize:40 }}>{w.emoji}</span>
      </div>

      <div style={{ padding:'0 16px 96px' }}>
        <div style={{ display:'flex', gap:8, marginBottom:10 }}>
          {[[lang==='en'?'Age':'숙성',w.age],['ABV',w.abv],[lang==='en'?'Region':'지역',lang==='en'?w.region.split(',')[0]:w.regionKo.split(' ')[0]]].map(([l,v])=>(
            <GlassCard key={l} glass={isGlass} style={{ flex:1, padding:'12px 10px', textAlign:'center' }}>
              <div style={{ color:'var(--text-muted)', fontSize:10, marginBottom:4 }}>{l}</div>
              <div style={{ color:'var(--text)', fontSize:13, fontFamily:'Playfair Display', fontWeight:600 }}>{v}</div>
            </GlassCard>
          ))}
        </div>

        <GlassCard glass={isGlass} style={{ padding:20, marginBottom:10 }}>
          <div style={{ color:'var(--accent)', fontSize:11, letterSpacing:1.5, fontWeight:600, marginBottom:16 }}>{lang==='en'?'FLAVOR PROFILE':'풍미 프로파일'}</div>
          <FlavorBars flavor={w.flavor} lang={lang}/>
        </GlassCard>

        <GlassCard glass={isGlass} style={{ padding:20, marginBottom:10 }}>
          <div style={{ color:'var(--accent)', fontSize:11, letterSpacing:1.5, fontWeight:600, marginBottom:10 }}>{lang==='en'?'TASTING NOTES':'테이스팅 노트'}</div>
          <div style={{ color:'var(--text-dim)', fontSize:14, lineHeight:1.7, marginBottom:18 }}>{lang==='en'?w.tasting:w.tastingKo}</div>
          <div style={{ height:'1px', background:'var(--border-soft)', marginBottom:18 }}/>
          <div style={{ color:'var(--accent)', fontSize:11, letterSpacing:1.5, fontWeight:600, marginBottom:8 }}>{lang==='en'?'PAIRING':'페어링'}</div>
          <div style={{ color:'var(--text-dim)', fontSize:14 }}>{lang==='en'?w.pair:w.pairKo}</div>
        </GlassCard>

        <GlassCard glass={isGlass} style={{ padding:20, marginBottom:10 }}>
          <div style={{ color:'var(--accent)', fontSize:11, letterSpacing:1.5, fontWeight:600, marginBottom:14 }}>{lang==='en'?'HOW TO ENJOY':'즐기는 방법'}</div>
          <div style={{ display:'flex', gap:8 }}>
            {[['🥃','Neat',lang==='en'?'Pure':'니트'],['🧊','On the Rocks',lang==='en'?'Chilled':'온더록'],['💧','Splash',lang==='en'?'Drops':'물 추가']].map(([icon,label,sub],i)=>(
              <div key={label} style={{ flex:1, padding:'12px 8px', background:i===1?'var(--accent-dim)':'transparent', border:`1px solid ${i===1?'var(--accent)':'var(--border-soft)'}`, borderRadius:12, textAlign:'center' }}>
                <div style={{ fontSize:20, marginBottom:5 }}>{icon}</div>
                <div style={{ fontSize:11, color:i===1?'var(--accent)':'var(--text-dim)', fontWeight:i===1?600:400 }}>{label}</div>
                <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:2 }}>{sub}</div>
              </div>
            ))}
          </div>
        </GlassCard>

        {price && (
          <GlassCard glass={isGlass} style={{ padding:20, marginBottom:10 }}>
            <div style={{ color:'var(--accent)', fontSize:11, letterSpacing:1.5, fontWeight:600, marginBottom:14 }}>{lang==='en'?'PRICE & AVAILABILITY':'가격 및 구매 정보'}</div>
            <div style={{ display:'flex', gap:10, marginBottom:16 }}>
              <div style={{ flex:1.2, background:'var(--accent-dim)', border:'1px solid var(--border)', borderRadius:12, padding:'12px', textAlign:'center' }}>
                <div style={{ fontSize:10, color:'var(--text-muted)', marginBottom:5 }}>KRW</div>
                <div style={{ fontFamily:'Playfair Display', fontSize:16, fontWeight:700, color:'var(--text)' }}>₩{price.krw}</div>
              </div>
              <div style={{ flex:1, background:'var(--card)', border:'1px solid var(--border-soft)', borderRadius:12, padding:'12px', textAlign:'center' }}>
                <div style={{ fontSize:10, color:'var(--text-muted)', marginBottom:5 }}>USD</div>
                <div style={{ fontFamily:'Playfair Display', fontSize:16, fontWeight:700, color:'var(--text)' }}>{price.usd}</div>
              </div>
              <div style={{ flex:0.9, background:'var(--card)', border:'1px solid var(--border-soft)', borderRadius:12, padding:'12px', textAlign:'center' }}>
                <div style={{ fontSize:10, color:'var(--text-muted)', marginBottom:5 }}>Tier</div>
                <div style={{ fontFamily:'Playfair Display', fontSize:13, fontWeight:700, color:'var(--text)' }}>{lang==='en'?price.tier:price.tierKo}</div>
              </div>
            </div>
            <div style={{ fontSize:12, color:'var(--text-muted)', marginBottom:10 }}>{lang==='en'?'Where to buy:':'구매처:'}</div>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:12 }}>
              {price.buy.map(s=>(
                <span key={s} style={{ background:'var(--border-soft)', borderRadius:8, padding:'5px 11px', color:'var(--text-dim)', fontSize:12 }}>{s}</span>
              ))}
            </div>
          </GlassCard>
        )}

        <GlassCard glass={isGlass} style={{ padding:20, marginBottom:20 }}>
          <div style={{ color:'var(--accent)', fontSize:11, letterSpacing:1.5, fontWeight:600, marginBottom:12 }}>{lang==='en'?'WHY THIS MATCH':'매칭 이유'}</div>
          <div style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
            <span style={{ fontSize:32, lineHeight:1 }}>{w.emoji}</span>
            <div style={{ color:'var(--text-dim)', fontSize:13, lineHeight:1.75 }}>{lang==='en'?w.desc:w.descKo}</div>
          </div>
        </GlassCard>

        <button onClick={()=>go('direct')} style={{
          width:'100%', padding:'17px', background:'var(--accent)', border:'none', borderRadius:14,
          color:'#fff', fontFamily:'Noto Sans KR', fontWeight:600, fontSize:15, cursor:'pointer',
          boxShadow:'0 8px 24px var(--accent-glow)',
        }}>{lang==='en'?'Try Another Type ↻':'다른 MBTI 탐색 ↻'}</button>
      </div>
    </div>
  );
}

// ── CollectionScreen ──────────────────────────────────────────
function CollectionScreen({ go, lang, setMBTI }) {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const all = Object.entries(D.WHISKY_DATA);
  const filters=[{id:'all',label:lang==='en'?'All':'전체'},{id:'peaty',label:lang==='en'?'Peaty':'피티'},{id:'sweet',label:lang==='en'?'Sweet':'달콤'},{id:'complex',label:lang==='en'?'Complex':'복잡'}];

  const filtered = all.filter(([type,w])=>{
    const q=search.toLowerCase();
    const ms=!q||w.name.toLowerCase().includes(q)||type.includes(q.toUpperCase())||w.tags.some(t=>t.toLowerCase().includes(q))||w.tagsKo.some(t=>t.includes(q));
    const mf=filter==='all'||(filter==='peaty'&&w.flavor.peaty>50)||(filter==='sweet'&&w.flavor.sweet>70)||(filter==='complex'&&w.flavor.oaky>70);
    return ms&&mf;
  });

  return (
    <div style={{ minHeight:'100vh' }}>
      <NavBar title={lang==='en'?'Collection':'위스키 컬렉션'} onBack={()=>go('splash')}/>
      <div style={{ padding:'14px 16px 0' }}>
        <div style={{ background:'var(--card)', border:'1px solid var(--border-soft)', borderRadius:12, padding:'10px 14px', display:'flex', gap:10, alignItems:'center', marginBottom:12 }}>
          <span style={{ color:'var(--text-muted)', fontSize:14 }}>🔍</span>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder={lang==='en'?'Search whisky or MBTI...':'위스키 또는 MBTI 검색...'}
            style={{ flex:1, background:'none', border:'none', outline:'none', color:'var(--text)', fontFamily:'Noto Sans KR', fontSize:14 }}/>
        </div>
        <div style={{ display:'flex', gap:8, marginBottom:14, overflowX:'auto', paddingBottom:2 }}>
          {filters.map(f=>(
            <button key={f.id} onClick={()=>setFilter(f.id)} style={{
              padding:'7px 16px', borderRadius:20, border:'none', cursor:'pointer',
              background:filter===f.id?'var(--accent)':'var(--card)',
              color:filter===f.id?'#fff':'var(--text-dim)',
              fontFamily:'Noto Sans KR', fontSize:13, fontWeight:filter===f.id?600:400,
              flexShrink:0, transition:'all 0.18s',
              boxShadow:filter===f.id?'0 4px 12px var(--accent-glow)':'none',
            }}>{f.label}</button>
          ))}
        </div>
      </div>
      <div style={{ padding:'0 16px 96px' }}>
        {filtered.map(([type,w])=>(
          <button key={type} onClick={()=>{ setMBTI(type); go('result'); }} style={{
            width:'100%', background:'var(--card)', border:'1px solid var(--border-soft)',
            borderRadius:16, padding:'14px', marginBottom:8, cursor:'pointer', textAlign:'left',
            display:'flex', alignItems:'center', gap:14, transition:'border-color 0.18s',
          }}
          onMouseEnter={e=>e.currentTarget.style.borderColor='var(--border)'}
          onMouseLeave={e=>e.currentTarget.style.borderColor='var(--border-soft)'}
          >
            <div style={{ width:44, height:44, borderRadius:12, flexShrink:0, background:`linear-gradient(135deg, ${w.color}cc, ${w.color}55)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>{w.emoji}</div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontFamily:'Playfair Display', fontSize:15, fontWeight:600, color:'var(--text)', marginBottom:3 }}>{w.name}</div>
              <div style={{ color:'var(--text-muted)', fontSize:12, marginBottom:5 }}>{lang==='en'?w.region:w.regionKo} · {w.age}</div>
              <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                {(lang==='en'?w.tags:w.tagsKo).slice(0,2).map(t=>(
                  <span key={t} style={{ background:'var(--pill)', borderRadius:10, padding:'2px 8px', color:'var(--accent)', fontSize:11 }}>{t}</span>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontFamily:'Playfair Display', fontSize:14, fontWeight:700, color:'var(--text-muted)', letterSpacing:0.5, textAlign:'right' }}>{type}</div>
              {D.WHISKY_PRICE[type] && (
                <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:3, textAlign:'right' }}>₩{D.WHISKY_PRICE[type].krw.split('–')[0]}~</div>
              )}
            </div>
          </button>
        ))}
        {filtered.length===0&&<div style={{ textAlign:'center', padding:'40px', color:'var(--text-muted)' }}>{lang==='en'?'No results found':'검색 결과 없음'}</div>}
      </div>
    </div>
  );
}

// ── ProfileScreen ─────────────────────────────────────────────
function ProfileScreen({ go, lang, profile, setProfile, setMBTI }) {
  const w = profile.mbti ? D.WHISKY_DATA[profile.mbti] : null;
  const price = profile.mbti ? D.WHISKY_PRICE[profile.mbti] : null;
  const clear = ()=>{ setProfile({mbti:null,history:[],birthdate:null}); };

  return (
    <div style={{ minHeight:'100vh' }}>
      <NavBar title={lang==='en'?'My Profile':'나의 프로필'}/>
      <div style={{ padding:'24px 16px 96px' }}>
        {w ? (
          <>
            <div style={{ background:`linear-gradient(135deg, ${w.color}22, var(--card))`, border:'1px solid var(--border)', borderRadius:20, padding:'24px', marginBottom:14 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:18 }}>
                <div>
                  <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:5, letterSpacing:1 }}>MY TYPE</div>
                  <div style={{ fontFamily:'Playfair Display', fontSize:50, fontWeight:700, color:'var(--accent)', lineHeight:1, letterSpacing:3 }}>{profile.mbti}</div>
                  <div style={{ color:'var(--text-dim)', fontSize:14, marginTop:5 }}>{lang==='en'?w.character:w.characterKo}</div>
                </div>
                <span style={{ fontSize:52 }}>{w.emoji}</span>
              </div>
              <div style={{ height:'1px', background:'var(--border-soft)', marginBottom:16 }}/>
              <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:5, letterSpacing:1 }}>MY DRAM</div>
              <div style={{ fontFamily:'Playfair Display', fontSize:20, fontWeight:700, color:'var(--text)', marginBottom:3 }}>{w.name}</div>
              <div style={{ color:'var(--text-muted)', fontSize:13, marginBottom:14 }}>
                {lang==='en'?w.region:w.regionKo} · {w.age} · {w.abv}
              </div>
              {price&&<div style={{ fontSize:13, color:'var(--accent)', marginBottom:14 }}>₩{price.krw} · {lang==='en'?price.tier:price.tierKo}</div>}
              <button onClick={()=>go('result')} style={{ width:'100%', padding:'13px', background:'var(--accent)', border:'none', borderRadius:12, color:'#fff', fontFamily:'Noto Sans KR', fontWeight:600, fontSize:14, cursor:'pointer' }}>
                {lang==='en'?'View My Whisky →':'나의 위스키 보기 →'}
              </button>
            </div>

            {profile.birthdate && (
              <div style={{ background:'var(--card)', border:'1px solid var(--border-soft)', borderRadius:16, padding:'16px', marginBottom:14 }}>
                <div style={{ color:'var(--accent)', fontSize:11, letterSpacing:1.5, fontWeight:600, marginBottom:14 }}>{lang==='en'?'TODAY\'S BIORHYTHM':'오늘의 바이오리듬'}</div>
                <BiorythmWidget birthdate={profile.birthdate} lang={lang} mbti={profile.mbti} onWhiskyHint={(t)=>{ setMBTI(t); go('result'); }}/>
              </div>
            )}

            {!profile.birthdate && (
              <button onClick={()=>go('biorhythm')} style={{
                width:'100%', padding:'14px', background:'none',
                border:'1px solid var(--border)', borderRadius:14,
                color:'var(--text-dim)', fontFamily:'Noto Sans KR', fontSize:14, cursor:'pointer',
                marginBottom:14, display:'flex', alignItems:'center', justifyContent:'center', gap:8,
              }}>
                <span>🌊</span>
                {lang==='en'?'Add Biorhythm':'바이오리듬 추가하기'}
              </button>
            )}

            {profile.history && profile.history.length > 1 && (
              <div style={{ background:'var(--card)', border:'1px solid var(--border-soft)', borderRadius:16, padding:'16px', marginBottom:14 }}>
                <div style={{ color:'var(--accent)', fontSize:11, letterSpacing:1.5, fontWeight:600, marginBottom:14 }}>{lang==='en'?'RECENT TYPES':'최근 탐색'}</div>
                {profile.history.slice(1).map(t=>{
                  const hw=D.WHISKY_DATA[t];
                  return (
                    <button key={t} onClick={()=>{ setMBTI(t); go('result'); }} style={{ width:'100%', background:'none', border:'none', cursor:'pointer', textAlign:'left', display:'flex', alignItems:'center', gap:12, padding:'8px 0', borderBottom:'1px solid var(--border-soft)' }}>
                      <span style={{ fontSize:22 }}>{hw.emoji}</span>
                      <div>
                        <span style={{ fontFamily:'Playfair Display', fontSize:14, fontWeight:600, color:'var(--accent)', marginRight:8 }}>{t}</span>
                        <span style={{ color:'var(--text-dim)', fontSize:13 }}>{hw.name}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            <button onClick={clear} style={{ width:'100%', padding:'13px', background:'none', border:'1px solid rgba(255,80,80,0.2)', borderRadius:12, color:'rgba(255,120,120,0.6)', fontFamily:'Noto Sans KR', fontSize:13, cursor:'pointer' }}>
              {lang==='en'?'Reset Profile':'프로필 초기화'}
            </button>
          </>
        ) : (
          <div style={{ textAlign:'center', padding:'60px 20px' }}>
            <div style={{ fontSize:48, marginBottom:16 }}>🥃</div>
            <div style={{ fontFamily:'Playfair Display', fontSize:22, fontWeight:700, color:'var(--text)', marginBottom:10 }}>{lang==='en'?'No profile yet':'아직 프로필이 없어요'}</div>
            <div style={{ color:'var(--text-muted)', fontSize:14, marginBottom:28 }}>{lang==='en'?'Find your MBTI whisky first':'MBTI 위스키를 먼저 찾아보세요'}</div>
            <button onClick={()=>go('onboarding')} style={{ padding:'14px 28px', background:'var(--accent)', border:'none', borderRadius:12, color:'#fff', fontFamily:'Noto Sans KR', fontWeight:600, fontSize:15, cursor:'pointer' }}>
              {lang==='en'?'Get Started →':'시작하기 →'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

Object.assign(window, {
  SplashScreen, OnboardingScreen, QuizScreen, DirectScreen,
  BiorythmScreen, ResultScreen, DetailScreen, CollectionScreen, ProfileScreen,
});
