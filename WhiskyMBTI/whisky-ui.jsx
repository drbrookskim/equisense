// whisky-ui.jsx — shared UI components
// Exports: NavBar, GlassCard, FlavorBars, PourAnimation, ShareCard, BiorythmWidget

const { useState, useEffect, useRef, useCallback } = React;

// ── NavBar ────────────────────────────────────────────────────
function NavBar({ title, onBack, right }) {
  return (
    <div style={{
      position:'sticky', top:0, zIndex:50,
      background:'rgba(8,6,4,0.88)',
      backdropFilter:'blur(20px)',
      borderBottom:'1px solid var(--border-soft)',
      display:'flex', alignItems:'center',
      padding:'0 16px', height:52, gap:12,
    }}>
      {onBack && (
        <button onClick={onBack} style={{
          background:'none', border:'none', color:'var(--accent)',
          cursor:'pointer', fontSize:22, lineHeight:1, padding:'0 4px',
          display:'flex', alignItems:'center',
        }}>‹</button>
      )}
      <div style={{
        flex:1, fontFamily:'Playfair Display, serif',
        fontSize:17, fontWeight:600, color:'var(--text)', letterSpacing:0.3,
      }}>{title}</div>
      {right}
    </div>
  );
}

// ── GlassCard ─────────────────────────────────────────────────
function GlassCard({ children, style={}, glass=true }) {
  return (
    <div style={{
      background: glass ? 'rgba(255,255,255,0.028)' : 'var(--card)',
      border:'1px solid var(--border-soft)',
      borderRadius:18,
      backdropFilter: glass ? 'blur(16px)' : 'none',
      ...style,
    }}>{children}</div>
  );
}

// ── FlavorBars ────────────────────────────────────────────────
function FlavorBars({ flavor, lang }) {
  const labels = {
    peaty:  { ko:'피트',    en:'Peaty'  },
    sweet:  { ko:'달콤함',  en:'Sweet'  },
    spicy:  { ko:'스파이시',en:'Spicy'  },
    fruity: { ko:'과일향',  en:'Fruity' },
    oaky:   { ko:'오크',    en:'Oaky'   },
  };
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
      {Object.entries(flavor).map(([k,v]) => (
        <div key={k}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
            <span style={{ color:'var(--text-dim)', fontSize:12 }}>
              {lang==='en' ? labels[k].en : labels[k].ko}
            </span>
            <span style={{ color:'var(--text-muted)', fontSize:11, fontFamily:'Playfair Display' }}>{v}</span>
          </div>
          <div style={{ height:3, background:'rgba(255,255,255,0.06)', borderRadius:2, overflow:'hidden' }}>
            <div style={{
              height:'100%', borderRadius:2,
              width:`${v}%`,
              background:'linear-gradient(90deg, rgba(255,107,26,0.5), var(--accent))',
              transition:'width 1.1s cubic-bezier(0.22,1,0.36,1)',
            }}/>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── PourAnimation ─────────────────────────────────────────────
function PourAnimation({ color, onComplete }) {
  const [fill, setFill] = useState(0);   // 0–62 (% height of liquid in glass)
  const [stream, setStream] = useState(true);
  const [done, setDone] = useState(false);
  const rafRef = useRef(null);

  useEffect(() => {
    let start = null;
    const DURATION = 1400;
    const TARGET = 62;

    const step = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / DURATION, 1);
      // ease out cubic
      const eased = 1 - Math.pow(1 - p, 3);
      setFill(eased * TARGET);
      if (p < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        setStream(false);
        setTimeout(() => { setDone(true); onComplete?.(); }, 400);
      }
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [color]);

  // Liquid y-position in SVG coords (glass goes from y=14 to y=96, height=82)
  // fill=0 → y=96, fill=62 → y=96-62*0.82 = 45
  const glassBottom = 93;
  const glassTop    = 18;
  const glassH      = glassBottom - glassTop;
  const liquidY     = glassBottom - (fill / 100) * glassH;
  const liquidH     = glassBottom - liquidY;

  return (
    <div style={{ position:'relative', display:'inline-block' }}>
      <svg width="180" height="150" viewBox="0 0 180 150" fill="none">
        <defs>
          <linearGradient id={`liq-pour-${color.replace('#','')}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.9"/>
            <stop offset="100%" stopColor={color} stopOpacity="0.45"/>
          </linearGradient>
          <linearGradient id="glassBodyGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="white" stopOpacity="0.04"/>
            <stop offset="38%" stopColor="white" stopOpacity="0.11"/>
            <stop offset="100%" stopColor="white" stopOpacity="0.02"/>
          </linearGradient>
          <clipPath id="glassClip">
            <path d="M25 14 L22 93 Q22 103 35 103 L145 103 Q158 103 158 93 L155 14 Z"/>
          </clipPath>
          <radialGradient id="iceG2" cx="40%" cy="35%" r="55%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.78)"/>
            <stop offset="100%" stopColor="rgba(200,235,255,0.22)"/>
          </radialGradient>
        </defs>

        {/* Pour stream */}
        {stream && (
          <g>
            {/* bottle spout area */}
            <rect x="118" y="0" width="14" height="20" rx="4" fill="rgba(255,255,255,0.15)"/>
            {/* liquid stream */}
            <path
              d={`M122 18 Q124 ${liquidY*0.7} 128 ${liquidY}`}
              stroke={color} strokeWidth="5" strokeOpacity="0.7"
              strokeLinecap="round" fill="none"
              style={{ filter:`drop-shadow(0 0 4px ${color}aa)` }}
            />
            <path
              d={`M124 18 Q126 ${liquidY*0.7} 130 ${liquidY}`}
              stroke={color} strokeWidth="3" strokeOpacity="0.4"
              strokeLinecap="round" fill="none"
            />
            {/* splash drops at surface */}
            {fill > 5 && (
              <g style={{ animation:'splash 0.3s ease infinite' }}>
                <circle cx="126" cy={liquidY-3} r="2.5" fill={color} opacity="0.6"/>
                <circle cx="133" cy={liquidY-5} r="1.5" fill={color} opacity="0.4"/>
                <circle cx="119" cy={liquidY-4} r="1.8" fill={color} opacity="0.35"/>
              </g>
            )}
          </g>
        )}

        {/* Glass body */}
        <path d="M25 14 L22 93 Q22 103 35 103 L145 103 Q158 103 158 93 L155 14 Z"
          fill="url(#glassBodyGrad)" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5"/>

        {/* Liquid fill (clipped to glass) */}
        <g clipPath="url(#glassClip)">
          <rect
            x="22" y={liquidY}
            width="136" height={liquidH}
            fill={`url(#liq-pour-${color.replace('#','')})`}
          />
          {/* liquid surface wave */}
          {fill > 3 && (
            <ellipse
              cx="90" cy={liquidY}
              rx="62" ry="3"
              fill={color} opacity="0.35"
              style={{ animation:'wave 1.8s ease-in-out infinite' }}
            />
          )}
        </g>

        {/* Ice cube */}
        {fill > 30 && (
          <g clipPath="url(#glassClip)" style={{ opacity: Math.min((fill-30)/20, 1) }}>
            <rect x="66" y="68" width="46" height="30" rx="6" fill="url(#iceG2)" opacity="0.55"/>
            <rect x="66" y="68" width="46" height="30" rx="6"
              fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="0.75"/>
          </g>
        )}

        {/* Rim highlight */}
        <rect x="25" y="14" width="130" height="8" rx="4" fill="rgba(255,255,255,0.1)"/>
        {/* Side shine */}
        <path d="M34 22 L30 88" stroke="white" strokeWidth="2.5" opacity="0.06" strokeLinecap="round"/>
      </svg>

      {/* Glow */}
      <div style={{
        position:'absolute', inset:-16,
        background:`radial-gradient(circle at 50% 75%, ${color}28 0%, transparent 60%)`,
        pointerEvents:'none',
        opacity: fill / 62,
      }}/>

      <style>{`
        @keyframes wave {
          0%,100%{ ry:3 } 50%{ ry:5 }
        }
        @keyframes splash {
          0%{ opacity:0.6 transform:translateY(0) }
          100%{ opacity:0; transform:translateY(-8px) }
        }
      `}</style>
    </div>
  );
}

// ── ShareCard ─────────────────────────────────────────────────
function ShareCard({ mbti, lang, onClose }) {
  const canvasRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [copied, setCopied] = useState(false);
  const D = window.WHISKY_APP_DATA;
  const w = D.WHISKY_DATA[mbti];
  if (!w) return null;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = 800, H = 1000;
    canvas.width = W; canvas.height = H;

    // Background
    const bgGrad = ctx.createRadialGradient(W/2, H*0.2, 0, W/2, H*0.2, W*0.8);
    bgGrad.addColorStop(0, '#1a0e04');
    bgGrad.addColorStop(1, '#080604');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // Accent glow blob
    const glowGrad = ctx.createRadialGradient(W/2, 200, 0, W/2, 200, 320);
    glowGrad.addColorStop(0, w.color + '40');
    glowGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = glowGrad;
    ctx.fillRect(0, 0, W, H);

    // Top bar accent line
    ctx.fillStyle = '#FF6B1A';
    ctx.fillRect(0, 0, W, 4);

    // Logo top
    ctx.fillStyle = 'rgba(255,107,26,0.5)';
    ctx.font = '500 22px "Helvetica Neue", sans-serif';
    ctx.letterSpacing = '8px';
    ctx.fillText('WHISKY × MBTI', W/2 - ctx.measureText('WHISKY × MBTI').width/2 - 8, 52);

    // MBTI Type
    ctx.fillStyle = '#FF6B1A';
    ctx.font = 'bold 120px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(mbti, W/2, 230);

    // Character name
    ctx.fillStyle = 'rgba(240,234,214,0.7)';
    ctx.font = '400 32px Georgia, serif';
    ctx.fillText(lang==='en' ? w.character : w.characterKo, W/2, 278);

    // Divider
    ctx.strokeStyle = 'rgba(255,107,26,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(W*0.25, 310); ctx.lineTo(W*0.75, 310); ctx.stroke();

    // Whisky name
    ctx.fillStyle = '#F0EAD6';
    ctx.font = 'bold 48px Georgia, serif';
    ctx.fillText(w.name, W/2, 380);

    // Region + age
    ctx.fillStyle = 'rgba(240,234,214,0.5)';
    ctx.font = '300 26px "Helvetica Neue", sans-serif';
    ctx.fillText((lang==='en' ? w.region : w.regionKo) + '  ·  ' + w.age + '  ·  ' + w.abv, W/2, 422);

    // Tags
    const tags = lang==='en' ? w.tags : w.tagsKo;
    let tagX = W/2 - (tags.length * 130)/2 + 65;
    tags.forEach(tag => {
      const tw = ctx.measureText('#' + tag).width + 32;
      ctx.fillStyle = 'rgba(255,107,26,0.12)';
      roundRect(ctx, tagX - tw/2, 448, tw, 36, 18);
      ctx.fillStyle = '#FF6B1A';
      ctx.font = '400 20px "Helvetica Neue", sans-serif';
      ctx.fillText('#' + tag, tagX, 472);
      tagX += 150;
    });

    // Description
    ctx.fillStyle = 'rgba(240,234,214,0.65)';
    ctx.font = '300 24px "Helvetica Neue", sans-serif';
    const desc = lang==='en' ? w.desc : w.descKo;
    wrapText(ctx, desc, W/2, 560, W*0.75, 36);

    // Tasting label
    ctx.fillStyle = 'rgba(255,107,26,0.8)';
    ctx.font = '600 18px "Helvetica Neue", sans-serif';
    ctx.letterSpacing = '3px';
    ctx.fillText('TASTING NOTES', W/2, 680);
    ctx.letterSpacing = '0px';

    // Tasting text
    ctx.fillStyle = 'rgba(240,234,214,0.55)';
    ctx.font = '300 22px "Helvetica Neue", sans-serif';
    const tasting = lang==='en' ? w.tasting : w.tastingKo;
    wrapText(ctx, tasting, W/2, 720, W*0.7, 32);

    // Flavor bars
    const flavors = Object.entries(w.flavor);
    const barLabels = { peaty:{ko:'피트',en:'Peaty'}, sweet:{ko:'달콤함',en:'Sweet'},
      spicy:{ko:'스파이시',en:'Spicy'}, fruity:{ko:'과일향',en:'Fruity'}, oaky:{ko:'오크',en:'Oaky'} };
    const barStartY = 800;
    const barW = W * 0.6;
    const barStartX = (W - barW) / 2;
    flavors.forEach(([k, v], i) => {
      const y = barStartY + i * 28;
      ctx.fillStyle = 'rgba(240,234,214,0.4)';
      ctx.font = '300 18px "Helvetica Neue", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(lang==='en' ? barLabels[k].en : barLabels[k].ko, barStartX, y+14);
      // bg bar
      ctx.fillStyle = 'rgba(255,255,255,0.07)';
      roundRect(ctx, barStartX + 120, y, barW - 120, 10, 5);
      // fill bar
      const fillGrad = ctx.createLinearGradient(barStartX+120, y, barStartX+120+(barW-120)*v/100, y);
      fillGrad.addColorStop(0, 'rgba(255,107,26,0.5)');
      fillGrad.addColorStop(1, '#FF6B1A');
      ctx.fillStyle = fillGrad;
      roundRect(ctx, barStartX + 120, y, (barW - 120) * v / 100, 10, 5);
      ctx.textAlign = 'center';
    });

    // Bottom
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(240,234,214,0.25)';
    ctx.font = '300 18px "Helvetica Neue", sans-serif';
    ctx.fillText('whiskymbti.app', W/2, 970);

    setReady(true);
  }, [mbti, lang]);

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x+r, y);
    ctx.lineTo(x+w-r, y);
    ctx.quadraticCurveTo(x+w, y, x+w, y+r);
    ctx.lineTo(x+w, y+h-r);
    ctx.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
    ctx.lineTo(x+r, y+h);
    ctx.quadraticCurveTo(x, y+h, x, y+h-r);
    ctx.lineTo(x, y+r);
    ctx.quadraticCurveTo(x, y, x+r, y);
    ctx.closePath();
    ctx.fill();
  }

  function wrapText(ctx, text, x, y, maxW, lineH) {
    const words = text.split(' ');
    let line = '';
    let curY = y;
    for (let i = 0; i < words.length; i++) {
      const test = line + words[i] + ' ';
      if (ctx.measureText(test).width > maxW && i > 0) {
        ctx.fillText(line, x, curY);
        line = words[i] + ' ';
        curY += lineH;
      } else { line = test; }
    }
    ctx.fillText(line, x, curY);
  }

  const download = () => {
    const canvas = canvasRef.current;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url; a.download = `WhiskyMBTI_${mbti}.png`; a.click();
  };

  const copyToClipboard = async () => {
    try {
      const canvas = canvasRef.current;
      canvas.toBlob(async (blob) => {
        await navigator.clipboard.write([new ClipboardItem({'image/png': blob})]);
        setCopied(true); setTimeout(()=>setCopied(false), 2000);
      });
    } catch { download(); }
  };

  const share = async () => {
    try {
      const canvas = canvasRef.current;
      canvas.toBlob(async (blob) => {
        const file = new File([blob], `WhiskyMBTI_${mbti}.png`, {type:'image/png'});
        if (navigator.share && navigator.canShare({files:[file]})) {
          await navigator.share({
            title: `나의 MBTI 위스키 — ${mbti}`,
            text: `${w.name}이(가) 나의 위스키입니다!`,
            files: [file],
          });
        } else { download(); }
      });
    } catch { download(); }
  };

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:1000,
      background:'rgba(0,0,0,0.88)',
      backdropFilter:'blur(12px)',
      display:'flex', flexDirection:'column',
      alignItems:'center', justifyContent:'center',
      padding:20,
    }} onClick={onClose}>
      <div style={{
        background:'var(--surface)', border:'1px solid var(--border)',
        borderRadius:20, padding:20, width:'100%', maxWidth:400,
        display:'flex', flexDirection:'column', gap:14,
      }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{
            fontFamily:'Playfair Display', fontSize:18, fontWeight:600, color:'var(--text)',
          }}>Share Card</span>
          <button onClick={onClose} style={{
            background:'none', border:'none', color:'var(--text-muted)',
            cursor:'pointer', fontSize:22,
          }}>×</button>
        </div>

        {/* Preview */}
        <div style={{
          borderRadius:12, overflow:'hidden',
          border:'1px solid var(--border-soft)',
          maxHeight:320, display:'flex', alignItems:'center', justifyContent:'center',
          background:'#080604',
        }}>
          <canvas ref={canvasRef} style={{ width:'100%', height:'auto', display:'block' }}/>
        </div>

        {!ready && (
          <div style={{ textAlign:'center', color:'var(--text-muted)', fontSize:13 }}>생성 중…</div>
        )}

        {ready && (
          <div style={{ display:'flex', gap:10 }}>
            <button onClick={download} style={{
              flex:1, padding:'13px 0',
              background:'var(--accent)', border:'none', borderRadius:12,
              color:'#fff', fontFamily:'Noto Sans KR', fontWeight:600, fontSize:14, cursor:'pointer',
              boxShadow:'0 6px 20px var(--accent-glow)',
            }}>⬇ 저장</button>
            <button onClick={copyToClipboard} style={{
              flex:1, padding:'13px 0',
              background: copied ? 'rgba(74,191,74,0.2)' : 'var(--card)',
              border:'1px solid var(--border-soft)',
              borderRadius:12, color: copied ? '#4abf4a' : 'var(--text-dim)',
              fontFamily:'Noto Sans KR', fontSize:14, cursor:'pointer',
            }}>
              {copied ? '✓ 복사됨' : '📋 복사'}
            </button>
            <button onClick={share} style={{
              flex:1, padding:'13px 0',
              background:'var(--card)', border:'1px solid var(--border-soft)',
              borderRadius:12, color:'var(--text-dim)',
              fontFamily:'Noto Sans KR', fontSize:14, cursor:'pointer',
            }}>↗ 공유</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── BiorythmWidget ────────────────────────────────────────────
function BiorythmWidget({ birthdate, lang, mbti, onWhiskyHint }) {
  if (!birthdate) return null;

  const birth = new Date(birthdate);
  const today = new Date();
  const days  = Math.floor((today - birth) / 86400000);

  const cycles = {
    physical:     { period:23,  color:'#FF6B1A', labelKo:'신체', labelEn:'Physical' },
    emotional:    { period:28,  color:'#C8962A', labelKo:'감성', labelEn:'Emotional' },
    intellectual: { period:33,  color:'#4ABFBF', labelKo:'지성', labelEn:'Intellectual' },
  };

  const vals = {};
  Object.entries(cycles).forEach(([k,c]) => {
    vals[k] = Math.sin(2 * Math.PI * days / c.period);
  });

  // Suggest whisky type based on dominant state
  const D = window.WHISKY_APP_DATA;
  const BM = D.BIORHYTHM_MAP;
  const dominantKey = Object.entries(vals).sort((a,b)=>b[1]-a[1])[0][0];
  const stateKey = `${dominantKey}_${vals[dominantKey]>0?'high':'low'}`;
  const suggestions = BM[stateKey] || [];

  // Mini wave SVG: last 14 days + next 7 days
  const W = 320, H = 80, DAYS = 21, START_DAY = days - 14;
  const x = (i) => (i / (DAYS-1)) * W;
  const y = (v) => H/2 - v * (H/2 - 8);

  const wavePath = (period) => {
    const pts = Array.from({length:DAYS}, (_,i) => {
      const d = START_DAY + i;
      return [x(i), y(Math.sin(2*Math.PI*d/period))];
    });
    return 'M ' + pts.map(p=>p.join(',')).join(' L ');
  };

  const pct = (v) => Math.round((v + 1) / 2 * 100);

  return (
    <div>
      {/* Wave chart */}
      <div style={{
        background:'rgba(0,0,0,0.3)', borderRadius:12,
        padding:'12px 16px', marginBottom:14,
        border:'1px solid var(--border-soft)',
      }}>
        <div style={{
          fontSize:11, color:'var(--text-muted)', marginBottom:10,
          display:'flex', justifyContent:'space-between',
        }}>
          <span>← 14일 전</span>
          <span style={{ color:'var(--accent)', fontWeight:600 }}>오늘</span>
          <span>7일 후 →</span>
        </div>
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
          {/* Zero line */}
          <line x1="0" y1={H/2} x2={W} y2={H/2} stroke="rgba(255,255,255,0.08)" strokeWidth="1"/>
          {/* Today line */}
          <line x1={x(14)} y1="0" x2={x(14)} y2={H}
            stroke="rgba(255,107,26,0.4)" strokeWidth="1.5" strokeDasharray="4,3"/>
          {/* Waves */}
          {Object.entries(cycles).map(([k,c]) => (
            <path key={k} d={wavePath(c.period)} fill="none"
              stroke={c.color} strokeWidth="1.8" strokeLinejoin="round" opacity="0.85"/>
          ))}
          {/* Today dots */}
          {Object.entries(cycles).map(([k,c]) => (
            <circle key={k} cx={x(14)} cy={y(vals[k])} r="4"
              fill={c.color} stroke="var(--surface)" strokeWidth="1.5"/>
          ))}
        </svg>
      </div>

      {/* Current values */}
      <div style={{ display:'flex', gap:8, marginBottom:14 }}>
        {Object.entries(cycles).map(([k,c]) => {
          const v = vals[k];
          const pctVal = pct(v);
          return (
            <div key={k} style={{
              flex:1, padding:'10px 8px',
              background:`${c.color}12`,
              border:`1px solid ${c.color}30`,
              borderRadius:12, textAlign:'center',
            }}>
              <div style={{ fontSize:11, color:c.color, marginBottom:5, fontWeight:600 }}>
                {lang==='en' ? c.labelEn : c.labelKo}
              </div>
              <div style={{
                fontFamily:'Playfair Display', fontSize:22, fontWeight:700, color:'var(--text)',
              }}>{pctVal}</div>
              <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:2 }}>
                {v>0.3?(lang==='en'?'High':'상승'):v<-0.3?(lang==='en'?'Low':'하강'):(lang==='en'?'Mid':'중간')}
              </div>
            </div>
          );
        })}
      </div>

      {/* Whisky suggestion */}
      {suggestions.length > 0 && (
        <div style={{
          background:'var(--accent-dim)', border:'1px solid var(--border)',
          borderRadius:12, padding:'12px 16px',
          display:'flex', alignItems:'center', gap:12,
        }}>
          <span style={{ fontSize:24 }}>🥃</span>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:11, color:'var(--accent)', fontWeight:600, marginBottom:4 }}>
              {lang==='en'?'Today\'s Biorhythm Pick':'오늘의 바이오리듬 추천'}
            </div>
            <div style={{ fontSize:13, color:'var(--text-dim)' }}>
              {lang==='en'
                ? `Your ${dominantKey} is ${vals[dominantKey]>0?'high':'low'} — try `
                : `${dominantKey==='physical'?'신체':dominantKey==='emotional'?'감성':'지성'} 
                  ${vals[dominantKey]>0?'상승':'하강'} 중 — `}
              <button onClick={()=>onWhiskyHint?.(suggestions[0])} style={{
                background:'none', border:'none', color:'var(--accent)',
                cursor:'pointer', fontSize:13, fontFamily:'Noto Sans KR',
                textDecoration:'underline', padding:0,
              }}>
                {suggestions[0]} {window.WHISKY_APP_DATA.WHISKY_DATA[suggestions[0]]?.name}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

Object.assign(window, {
  NavBar, GlassCard, FlavorBars,
  PourAnimation, ShareCard, BiorythmWidget,
});
